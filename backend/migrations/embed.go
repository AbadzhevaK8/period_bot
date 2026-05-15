package migrations

import "embed"

// Files contains the SQL migrations shipped with the backend binary.
//
//go:embed *.sql
var Files embed.FS
