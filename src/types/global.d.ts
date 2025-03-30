declare module '*.md' {
  const content: {
    html: string
    attributes: Record<string, unknown>
  }
}

declare module '.png' {
  const content: string
  export default content
}
