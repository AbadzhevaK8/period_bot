package bot

import (
	"fmt"
	"log"
	"sync"
	"time"

	tele "gopkg.in/telebot.v3"
)

type updateDeduper struct {
	mu   sync.Mutex
	seen map[string]time.Time
}

func newUpdateDeduper() *updateDeduper {
	return &updateDeduper{seen: make(map[string]time.Time)}
}

func (d *updateDeduper) allowKey(key string) bool {
	d.mu.Lock()
	defer d.mu.Unlock()

	if ts, ok := d.seen[key]; ok {
		if time.Since(ts) < 30*time.Second {
			return false
		}
	}

	d.seen[key] = time.Now()
	if len(d.seen) > 1000 {
		threshold := time.Now().Add(-1 * time.Minute)
		for k, ts := range d.seen {
			if ts.Before(threshold) {
				delete(d.seen, k)
			}
		}
	}

	return true
}

func (d *updateDeduper) allowUpdate(updateID int) bool {
	return d.allowKey(fmt.Sprintf("u:%d", updateID))
}

func (d *updateDeduper) allowMessage(chatID int64, messageID int) bool {
	if chatID == 0 || messageID == 0 {
		return true
	}
	return d.allowKey(fmt.Sprintf("m:%d:%d", chatID, messageID))
}

func NewBot(token, webAppURL string) (*tele.Bot, error) {
	deduper := newUpdateDeduper()

	pref := tele.Settings{
		Token:  token,
		Poller: &tele.LongPoller{Timeout: 10 * time.Second},
	}
	b, err := tele.NewBot(pref)
	if err != nil {
		return nil, err
	}

	if _, err := b.Raw("setChatMenuButton", map[string]interface{}{
		"menu_button": tele.MenuButton{
			Type:   tele.MenuButtonWebApp,
			Text:   "Открыть",
			WebApp: &tele.WebApp{URL: webAppURL},
		},
	}); err != nil {
		return nil, err
	}

	configureBotProfile(b)

	b.Handle("/start", func(c tele.Context) error {
		msg := c.Message()
		if msg != nil {
			if !deduper.allowMessage(msg.Chat.ID, msg.ID) {
				return nil
			}
		}

		if !deduper.allowUpdate(c.Update().ID) {
			return nil
		}

		button := tele.ReplyMarkup{}
		webappBtn := button.WebApp("Открыть приложение", &tele.WebApp{URL: webAppURL})
		button.Inline(button.Row(webappBtn))
		return c.Send("Привет! Я помогу собрать календарь цикла: покажу фазы, прогноз энергии и подсказки на каждый день.\n\nНажми кнопку ниже, чтобы открыть приложение.", &button)
	})

	return b, nil
}

func configureBotProfile(b *tele.Bot) {
	description := "Календарь цикла помогает увидеть четыре фазы месяца и планировать дела с учётом энергии и самочувствия.\n\nУкажи дату начала менструации и длину цикла — приложение соберёт персональный календарь."

	if _, err := b.Raw("setMyShortDescription", map[string]string{
		"short_description": "Календарь цикла с фазами и прогнозом самочувствия.",
	}); err != nil {
		log.Printf("failed to set bot short description: %v", err)
	}

	if _, err := b.Raw("setMyDescription", map[string]string{
		"description": description,
	}); err != nil {
		log.Printf("failed to set bot description: %v", err)
	}
}
