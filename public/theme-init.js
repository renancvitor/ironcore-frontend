(() => {
  let preference;
  try {
    preference = localStorage.getItem('Ironcore-theme');
  } catch {}
  document.documentElement.dataset.theme =
    preference === 'light' || preference === 'dark'
      ? preference
      : window.matchMedia?.('(prefers-color-scheme: dark)').matches === false
        ? 'light'
        : 'dark';
})();
