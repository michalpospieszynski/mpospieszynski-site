// Markdown files imported as text (angular.json: "loader": { ".md": "text" }), e.g. the privacy policy.
declare module '*.md' {
  const content: string;
  export default content;
}
