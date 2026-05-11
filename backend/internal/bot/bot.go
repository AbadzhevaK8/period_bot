package bot

import (
	"time"

	tele "gopkg.in/telebot.v3"
)

func NewBot(token, webAppURL string) (*tele.Bot, error) {
	pref := tele.Settings{
		Token:  token,
		Poller: &tele.LongPoller{Timeout: 10 * time.Second},
	}
	b, err := tele.NewBot(pref)
	if err != nil {
		return nil, err
	}

	b.Handle("/start", func(c tele.Context) error {
		button := tele.ReplyMarkup{}
		webappBtn := button.WebApp("Открыть приложение", &tele.WebApp{URL: webAppURL})
		button.Reply(button.Row(webappBtn))
		return c.Send("Привет! Открой приложение для отслеживания цикла.", &button)
	})

	return b, nil
}
