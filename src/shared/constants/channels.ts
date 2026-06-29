/**
 * IPC channel constants — single source of truth for all IPC communication.
 *
 * Naming convention: `domain:action` (e.g. `collection:create`, `env:var:save`).
 * All channels used by both main process handlers and preload bridge are defined here.
 */

// -- Network ---------------------------------------------------------------
export const IPC_REQUEST_SEND = 'request:send'
export const IPC_REQUEST_ABORT = 'request:abort'

// -- Dialog ----------------------------------------------------------------
export const IPC_DIALOG_OPEN_FILE = 'dialog:open-file'
export const IPC_DIALOG_SAVE_FILE = 'dialog:save-file'

// -- System Config ---------------------------------------------------------
export const IPC_CONFIG_GET = 'config:get'
export const IPC_CONFIG_SAVE = 'config:save'

// -- Collections -----------------------------------------------------------
export const IPC_COLLECTION_LIST = 'collection:list'
export const IPC_COLLECTION_GET = 'collection:get'
export const IPC_COLLECTION_CREATE = 'collection:create'
export const IPC_COLLECTION_UPDATE = 'collection:update'
export const IPC_COLLECTION_DELETE = 'collection:delete'
export const IPC_COLLECTION_EXPORT = 'collection:export'
export const IPC_COLLECTION_IMPORT = 'collection:import'

// -- Folders ---------------------------------------------------------------
export const IPC_FOLDER_CREATE = 'folder:create'
export const IPC_FOLDER_UPDATE = 'folder:update'
export const IPC_FOLDER_DELETE = 'folder:delete'
export const IPC_FOLDER_MOVE = 'folder:move'

// -- Requests --------------------------------------------------------------
export const IPC_REQUEST_GET = 'request:get'
export const IPC_REQUEST_CREATE = 'request:create'
export const IPC_REQUEST_UPDATE = 'request:update'
export const IPC_REQUEST_DELETE = 'request:delete'
export const IPC_REQUEST_DUPLICATE = 'request:duplicate'
export const IPC_REQUEST_MOVE = 'request:move'
export const IPC_REQUEST_EXPORT_CURL = 'request:export-curl'

// -- Request Params --------------------------------------------------------
export const IPC_REQUEST_PARAM_BATCH_SAVE = 'request:param:batch-save'

// -- Request Headers -------------------------------------------------------
export const IPC_REQUEST_HEADER_BATCH_SAVE = 'request:header:batch-save'

// -- Request Body ----------------------------------------------------------
export const IPC_REQUEST_BODY_SAVE = 'request:body:save'
export const IPC_REQUEST_BODY_GET = 'request:body:get'

// -- Request Form Items ----------------------------------------------------
export const IPC_REQUEST_FORM_ITEM_BATCH_SAVE = 'request:form-item:batch-save'

// -- Request Auth ----------------------------------------------------------
export const IPC_REQUEST_AUTH_SAVE = 'request:auth:save'
export const IPC_REQUEST_AUTH_GET = 'request:auth:get'

// -- Request Settings ------------------------------------------------------
export const IPC_REQUEST_SETTING_SAVE = 'request:setting:save'
export const IPC_REQUEST_SETTING_GET = 'request:setting:get'

// -- Environments ----------------------------------------------------------
export const IPC_ENV_LIST = 'env:list'
export const IPC_ENV_GET = 'env:get'
export const IPC_ENV_CREATE = 'env:create'
export const IPC_ENV_UPDATE = 'env:update'
export const IPC_ENV_DELETE = 'env:delete'
export const IPC_ENV_DUPLICATE = 'env:duplicate'
export const IPC_ENV_ACTIVATE = 'env:activate'
export const IPC_ENV_EXPORT = 'env:export'
export const IPC_ENV_IMPORT = 'env:import'

// -- Environment Variables -------------------------------------------------
export const IPC_ENV_VAR_LIST = 'env:var:list'
export const IPC_ENV_VAR_BATCH_SAVE = 'env:var:batch-save'
export const IPC_ENV_VAR_DELETE = 'env:var:delete'

// -- History ---------------------------------------------------------------
export const IPC_HISTORY_LIST = 'history:list'
export const IPC_HISTORY_SAVE = 'history:save'
export const IPC_HISTORY_DELETE = 'history:delete'
export const IPC_HISTORY_CLEAR = 'history:clear'
export const IPC_HISTORY_SEARCH = 'history:search'

// -- Test Scripts ----------------------------------------------------------
export const IPC_TEST_SCRIPT_SAVE = 'test-script:save'
export const IPC_TEST_SCRIPT_GET = 'test-script:get'
export const IPC_TEST_SCRIPT_DELETE = 'test-script:delete'
export const IPC_TEST_SCRIPT_RUN = 'test-script:run'

// -- Runner ----------------------------------------------------------------
export const IPC_RUNNER_EXECUTE = 'runner:execute'

// -- Cookies ---------------------------------------------------------------
export const IPC_COOKIE_LIST = 'cookie:list'
export const IPC_COOKIE_SAVE = 'cookie:save'
export const IPC_COOKIE_DELETE = 'cookie:delete'
export const IPC_COOKIE_CLEAR = 'cookie:clear'

// -- Search ----------------------------------------------------------------
export const IPC_SEARCH_GLOBAL = 'search:global'

// -- DB Utilities ----------------------------------------------------------
export const IPC_DB_BACKUP = 'db:backup'
export const IPC_DB_RESTORE = 'db:restore'
export const IPC_DB_CLEANUP = 'db:cleanup'

// -- Variable Resolution ---------------------------------------------------
export const IPC_VAR_RESOLVE = 'var:resolve'

// -- Import / Export -------------------------------------------------------
export const IPC_IMPORT_POSTMAN = 'import:postman'
export const IPC_IMPORT_CURL = 'import:curl'
export const IPC_EXPORT_POSTMAN = 'export:postman'

// -- Tabs ------------------------------------------------------------------
export const IPC_TABS_SAVE = 'tabs:save'
export const IPC_TABS_LOAD = 'tabs:load'
