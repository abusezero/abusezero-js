/** Call when consent is withdrawn; does not erase the customer's claim history. */
declare function forgetBrowser(): void;

/** Browser protection is always on. These are the shared names for what each
 * check received from the browser script, used by the SDK, the evaluation API
 * and the dashboard alike. */
/** Why the browser script returned no browser data. The script reports these
 * itself; `not_loaded` is the one reason a customer reports, when their consent
 * tool kept the script from loading at all. */
declare const browserReasons: readonly ["consent_declined", "not_loaded", "blocked", "timed_out", "failed", "site_not_listed", "sdk_outdated"];
type BrowserReason = typeof browserReasons[number];

/** Pass `deviceToken` to your server and send it as `identifiers.device_token`
 * in the check, whatever the status. It carries the browser data, or the reason
 * there is none. */
type Observation = {
    status: "available";
    token: string;
    expiresIn: number;
    deviceToken: string;
} | {
    status: "unavailable";
    reason: BrowserReason;
    deviceToken: string;
};
interface CollectionOptions {
    key: string;
    claimId: string;
    /** When this returns false, observe() sends no browser data for the claim. */
    consent?: () => boolean | Promise<boolean>;
    baseUrl?: string;
}
interface InitOptions {
    key: string;
    baseUrl?: string;
}
/** Reports once per page load that the script loaded here, so you can see in
 * the dashboard where it's installed. It sends only this site's address and
 * the script version, never visitor data. */
declare function init(options: InitOptions): void;
/** Collects browser data for one claim. Call it when the person submits, and
 * send `deviceToken` in that check. Collection is on by default; it stops only
 * when `consent` resolves to false or the browser can't reach AbuseZero. */
declare function observe(options: CollectionOptions): Promise<Observation>;

export { type BrowserReason, type CollectionOptions, type InitOptions, type Observation, forgetBrowser, init, observe };
