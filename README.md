Пример формы, из которой можно отправить данные на сервер из этого примера:

```typescript jsx
import React, { useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { SmartCaptcha } from '@yandex/smart-captcha';
import styles from '@src/theme/BlogLayout/styles.module.css'

function SignUpForm() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (event) => {
    if (!token) {
      return;
    }
    event.preventDefault();
    setDisabled(true);
    var data = {
      email: email,
      captchaToken: token
    };
    try {
      const response = await fetch('https://blog.nikolaymatrosov.ru/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        setSubmitted(true);
      } else {
        const error = await response.json();
        console.error(error);
        setError(error.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const buttonDisabled = disabled || !token || !email;
  return (
    <div id="signup-side" className={styles.signupForm}>
      <BrowserOnly fallback={<div>Loading...</div>}>
        {() => {
          if (submitted) {
            return <div>Спасибо за подписку! Вам придёт письмо для подтверждения на указанный email.</div>
          }
          if (error) {
            return <div className={styles.error}>
              {error}
            </div>
          }
          return <form onSubmit={onSubmit}>
            <h3>Подпишитесь на новые посты</h3>
            <input
              type="email"
              value={email}
              placeholder="Ваш email"
              onChange={(evt) => setEmail(evt.target.value)}
              className={styles.emailInput}
            />
            <SmartCaptcha
              sitekey="{YOUR_CLIENT_KEY}"
              onSuccess={setToken}
              language="ru"
            />
            <input type="submit" value="Подписаться" disabled={buttonDisabled} className={styles.submitBtn}/>
          </form>
        }}
      </BrowserOnly>
    </div>
  );
}
```

Форма делалась для блога на docusaurus. Поэтому если вам он не нужен можете смело убрать относящийся к нему код.
