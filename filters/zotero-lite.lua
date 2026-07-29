--
-- zotero-lite.lua
-- Lite version: uses Zotero native API, no BBT dependency
-- citekey = itemKey (8-char), no special characters
--

local json = require('lunajson')
local utils = require('utils')

-- -- global state -- --
local config = {
  format = nil
}

local state = {
  fetched = nil,
  reported = {}
}

local citekeys = {}

-- -- -- collect citekeys -- -- --
function Inlines_collect_citekeys(inlines)
  if not config.format then return inlines end

  for k, v in pairs(inlines) do
    if v.t == 'Cite' then
      for _, item in pairs(v.citations) do
        citekeys[item.id] = true
      end
    end
  end

  return inlines
end

-- -- -- load items from Zotero native API -- -- --
local function load_items()
  if state.fetched ~= nil then return end
  state.fetched = { items = {}, errors = {} }

  local keys = {}
  for k, _ in pairs(citekeys) do
    table.insert(keys, k)
  end

  if #keys == 0 then return end

  local keysParam = table.concat(keys, ',')
  local url = 'http://127.0.0.1:23119/api/users/0/items?format=csljson&itemKey=' .. keysParam
  local mt, contents = pandoc.mediabag.fetch(url, '.')
  local ok, fetched = pcall(json.decode, contents)

  if not ok then
    print('zotero-lite: could not fetch items: ' .. tostring(contents))
    state.fetched = { items = {}, errors = {} }
    return
  end

  if type(fetched) ~= 'table' then
    print('zotero-lite: unexpected response format')
    state.fetched = { items = {}, errors = {} }
    return
  end

  -- 将 itemKey 映射到 items
  for _, item in ipairs(fetched) do
    if item and item.id then
      state.fetched.items[item.id] = item
    end
  end
end

-- -- -- get item by citekey (= itemKey) -- -- --
local function get_item(citekey)
  load_items()

  if state.reported[citekey] then
    return nil
  end

  -- 直接用 citekey (= itemKey) 查找
  if state.fetched.items[citekey] then
    local itemData = state.fetched.items[citekey]
    -- 构造 zoteroData（Zotero 格式的元数据）
    local itemKey = citekey
    local zoteroData = {
      itemID = itemData.id or citekey,
      uri = 'http://zotero.org/users/0/items/' .. itemKey,
    }
    return itemData, zoteroData
  end

  state.reported[citekey] = true
  print('zotero-lite: @' .. citekey .. ' not found')
  return nil
end

-- -- -- format citation -- -- --
local function zotero_ref(cite)
  local content = utils.collect(cite.content)
  local csl = {
    citationID = utils.random_id(8),
    properties = {
      formattedCitation = '',
      plainCitation = '',
      noteIndex = 0
    },
    citationItems = {},
    schema = "https://github.com/citation-style-language/schema/raw/master/csl-citation.json"
  }

  for _, item in pairs(cite.citations) do
    local itemData, zoteroData = get_item(item.id)
    if itemData == nil then
      return cite
    end

    local citation = {
      id = zoteroData.itemID,
      uris = { zoteroData.uri },
      uri = { zoteroData.uri },
      itemData = itemData,
    }

    if item.mode == 'SuppressAuthor' then
      citation['suppress-author'] = true
    end

    citation.prefix = utils.collect(item.prefix)
    citation.suffix = utils.collect(item.suffix)
    table.insert(csl.citationItems, citation)
  end

  local field = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">'
  field = field .. ' ADDIN ZOTERO_ITEM CSL_CITATION ' .. utils.xmlescape(json.encode(csl)) .. '   '
  field = field .. '</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:noProof/></w:rPr><w:t>'
  field = field .. utils.xmlescape(content or '')
  field = field .. '</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>'
  return pandoc.RawInline('openxml', field)
end

-- -- -- config -- -- --
function Meta(meta)
  if string.match(FORMAT, 'docx') then
    config.format = 'docx'
  end
end

-- -- -- replace citations -- -- --
function Inlines_replace_cites(inlines)
  if not config.format then return inlines end

  for k, v in pairs(inlines) do
    if v.t == 'Cite' then
      inlines[k] = zotero_ref(v)
    end
  end

  return inlines
end

return {
  { Meta = Meta },
  { Inlines = Inlines_collect_citekeys },
  { Inlines = Inlines_replace_cites },
}