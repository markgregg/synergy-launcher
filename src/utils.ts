const isStandAlone = () => {
  return window.matchMedia('(display-mode: standalone)').matches
}

export const limitWindowHeight = (height: number) => {
  if (isStandAlone()) {
    window.resizeTo(window.outerWidth, height);
    window.addEventListener('resize', () => {
      window.resizeTo(window.outerWidth, height);
    })
  }
}