package api

import "testing"

func TestNotificationSettingsFromRequest(t *testing.T) {
	settings, err := notificationSettingsFromRequest(notificationSettingsRequest{
		Enabled:    true,
		NotifyTime: "09:30",
		Timezone:   "Europe/Moscow",
	}, 123)
	if err != nil {
		t.Fatalf("expected valid notification settings, got error: %v", err)
	}
	if settings.UserID != 123 || !settings.Enabled || settings.NotifyTime != "09:30" || settings.Timezone != "Europe/Moscow" {
		t.Fatalf("unexpected settings: %#v", settings)
	}
}

func TestNotificationSettingsFromRequestRejectsInvalidValues(t *testing.T) {
	tests := []notificationSettingsRequest{
		{Enabled: true, NotifyTime: "9:30", Timezone: "Europe/Moscow"},
		{Enabled: true, NotifyTime: "24:00", Timezone: "Europe/Moscow"},
		{Enabled: true, NotifyTime: "09:30", Timezone: ""},
		{Enabled: true, NotifyTime: "09:30", Timezone: "Mars/Base"},
	}

	for _, req := range tests {
		if _, err := notificationSettingsFromRequest(req, 123); err == nil {
			t.Fatalf("expected request to be rejected: %#v", req)
		}
	}
}
