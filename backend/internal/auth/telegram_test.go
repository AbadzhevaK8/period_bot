package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/url"
	"sort"
	"strings"
	"testing"
)

func TestValidateInitDataWithTelegramUser(t *testing.T) {
	botToken := "123456:test-token"
	values := url.Values{
		"auth_date": {"1710000000"},
		"query_id":  {"AAHdF6IQAAAAAN0XohDhrOrc"},
		"user":      {`{"id":123456789,"first_name":"Kate","last_name":"Test","username":"k8"}`},
	}

	user, err := ValidateInitData(signedInitData(values, botToken), botToken)
	if err != nil {
		t.Fatalf("expected valid initData, got error: %v", err)
	}

	if user.ID != 123456789 {
		t.Fatalf("expected user id 123456789, got %d", user.ID)
	}
	if user.FirstName != "Kate" {
		t.Fatalf("expected first name Kate, got %q", user.FirstName)
	}
	if user.LastName != "Test" {
		t.Fatalf("expected last name Test, got %q", user.LastName)
	}
	if user.Username != "k8" {
		t.Fatalf("expected username k8, got %q", user.Username)
	}
}

func TestValidateInitDataRejectsInvalidHash(t *testing.T) {
	botToken := "123456:test-token"
	values := url.Values{
		"auth_date": {"1710000000"},
		"user":      {`{"id":123456789,"first_name":"Kate"}`},
	}

	initData := signedInitData(values, botToken)
	initData = strings.Replace(initData, "Kate", "Mallory", 1)

	if _, err := ValidateInitData(initData, botToken); err == nil {
		t.Fatal("expected invalid hash error")
	}
}

func TestValidateInitDataRequiresUserData(t *testing.T) {
	botToken := "123456:test-token"
	values := url.Values{
		"auth_date": {"1710000000"},
		"query_id":  {"AAHdF6IQAAAAAN0XohDhrOrc"},
	}

	if _, err := ValidateInitData(signedInitData(values, botToken), botToken); err == nil {
		t.Fatal("expected missing user data error")
	}
}

func signedInitData(values url.Values, botToken string) string {
	signed := url.Values{}
	for key, value := range values {
		signed[key] = append([]string(nil), value...)
	}
	signed.Set("hash", telegramHash(values, botToken))
	return signed.Encode()
}

func telegramHash(values url.Values, botToken string) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	dataStrings := make([]string, 0, len(keys))
	for _, key := range keys {
		dataStrings = append(dataStrings, key+"="+values.Get(key))
	}
	dataCheckString := strings.Join(dataStrings, "\n")

	secretMac := hmac.New(sha256.New, []byte("WebAppData"))
	secretMac.Write([]byte(botToken))

	mac := hmac.New(sha256.New, secretMac.Sum(nil))
	mac.Write([]byte(dataCheckString))
	return hex.EncodeToString(mac.Sum(nil))
}
