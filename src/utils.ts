const isStandAlone = () => {
  return window.matchMedia('(display-mode: standalone)').matches
}


export const limitWindowSize = (width: number, height: number) => {
  if (isStandAlone()) {
    window.resizeTo(width, height) 
    window.addEventListener('resize', () => {
      window.resizeTo(width, height)
    })
  }
}