import {
  PublicClientApplication,
  EventType,
  type Configuration,
  type AuthenticationResult,
} from "@azure/msal-browser";

// Single-tenant Entra ID app registration. The tenant lock is enforced again
// on the server (via the JWT `tid` claim), so the FE only needs to know which
// tenant authority to use here.
const tenant = import.meta.env.VITE_AZURE_TENANT_ID as string;
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID as string;
export const apiScope = import.meta.env.VITE_API_SCOPE as string;

const config: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenant}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin + "/login",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(config);

// Order matters: initialize() registers internal state; handleRedirectPromise()
// processes the auth code in the URL after Entra redirects back. Without the
// second call MSAL silently drops the response and useIsAuthenticated() stays
// false — that's the "still on login page after sign-in" bug.
await msalInstance.initialize();
const response: AuthenticationResult | null = await msalInstance.handleRedirectPromise();
if (response?.account) {
  msalInstance.setActiveAccount(response.account);
} else {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) msalInstance.setActiveAccount(accounts[0]);
}

// Keep the active account in sync with later login/logout events so navigations
// after the initial bootstrap also see the right principal.
msalInstance.addEventCallback((event) => {
  if (
    (event.eventType === EventType.LOGIN_SUCCESS
      || event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
      || event.eventType === EventType.SSO_SILENT_SUCCESS)
    && event.payload
    && "account" in event.payload
    && event.payload.account
  ) {
    msalInstance.setActiveAccount(event.payload.account);
  }
});
