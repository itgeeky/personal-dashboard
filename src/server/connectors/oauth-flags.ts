export function jiraOAuthConfigured(): boolean {
  return Boolean(process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET);
}

export function zohoOAuthConfigured(): boolean {
  return Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
}

export function githubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}
