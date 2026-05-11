package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

type TelegramUser struct {
	ID        int64  `json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName,omitempty"`
	Username  string `json:"username,omitempty"`
}

func ValidateInitData(initData, botToken string) (*TelegramUser, error) {
	if initData == "" || botToken == "" {
		return nil, errors.New("initData and botToken are required")
	}

	values, err := url.ParseQuery(initData)
	if err != nil {
		return nil, err
	}

	hash := values.Get("hash")
	if hash == "" {
		return nil, errors.New("missing hash")
	}
	values.Del("hash")

	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var dataStrings []string
	for _, key := range keys {
		dataStrings = append(dataStrings, key+"="+values.Get(key))
	}
	dataCheckString := strings.Join(dataStrings, "\n")

	secret := sha256.Sum256([]byte("WebAppData" + botToken))
	mac := hmac.New(sha256.New, secret[:])
	mac.Write([]byte(dataCheckString))
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expected), []byte(hash)) {
		return nil, errors.New("invalid initData hash")
	}

	return &TelegramUser{
		ID:        parseInt64(values.Get("id")),
		FirstName: values.Get("first_name"),
		LastName:  values.Get("last_name"),
		Username:  values.Get("username"),
	}, nil
}

func parseInt64(value string) int64 {
	if value == "" {
		return 0
	}
	result, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0
	}
	return result
}
