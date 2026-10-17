import { useEffect, useState } from 'react';

const title = '把課表，放進行事曆。';

export function TypingTitle() {
  const [count, setCount] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? title.length : 0,
  );

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    const start = () => {
      clearTimeout(timer);
      if (preference.matches) {
        setCount(title.length);
        return;
      }
      setCount(0);
      let index = 0;
      let deleting = false;
      const advance = () => {
        index += deleting ? -1 : 1;
        setCount(index);
        if (index === title.length) {
          deleting = true;
          timer = setTimeout(advance, 3000);
        } else if (index === 0) {
          deleting = false;
          timer = setTimeout(advance, 900);
        } else {
          timer = setTimeout(advance, deleting ? 65 : index === 4 ? 260 : 110);
        }
      };
      timer = setTimeout(advance, 250);
    };
    start();
    preference.addEventListener('change', start);
    return () => {
      clearTimeout(timer);
      preference.removeEventListener('change', start);
    };
  }, []);

  return <h1 id="hero-heading" className={'typing-title'+(count===title.length?' is-complete':'')} aria-label={title}>
    <span className="title-reserve" aria-hidden="true">{title}</span>
    <span className="title-typed" aria-hidden="true">{title.slice(0,count)}</span>
  </h1>;
}
