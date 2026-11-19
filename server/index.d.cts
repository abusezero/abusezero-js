/** The body of every AbuseZero webhook request. `data` is the event's object, in the same
 * shape the REST API returns. New event types can appear within v1: ignore ones you don't handle. */
type WebhookEvent<T = Record<string, unknown>> = {
    /** `test` is true for a test event sent from the dashboard or the API, of any type: don't act on one. */
    object: "event";
    id: string;
    type: string;
    api_version: "v1";
    created_at: string;
    workspace: string;
    test: boolean;
    data: T;
};
declare class WebhookVerificationError extends Error {
    constructor(message: string);
}
type HeaderSource = Headers | Record<string, string | string[] | undefined>;
/** Checks an AbuseZero webhook request and returns its event. Pass the raw request body,
 * exactly as received, the request headers and the endpoint's signing secret. During a
 * rotation, pass both secrets; an empty slot is skipped. Throws WebhookVerificationError when
 * the signature doesn't match or the request is older than `toleranceSeconds` (default 300),
 * and TypeError when the secret or `toleranceSeconds` setting is unusable. */
declare function verifyWebhook<T = Record<string, unknown>>(input: {
    payload: string | Uint8Array;
    headers: HeaderSource;
    secret: string | readonly (string | undefined)[];
    toleranceSeconds?: number;
    now?: Date;
}): WebhookEvent<T>;

/** Skip reasons AbuseZero returns today. */
type KnownSkippedReason = "billing_overdue" | "service_inactive" | "insufficient_credits" | "benefit_paused";
/** The evaluation didn't run, so there is no allow or deny. New reasons can appear within v1: handle a reason you don't recognize like any other skip. */
type SkippedEvaluation = {
    status: "skipped";
    reason: KnownSkippedReason | (string & {});
};
/** A keyed hash you compute with your own secret. `createPhoneHash` and `createCustomIdentifier` build it for you. */
type KeyedHash = {
    algorithm: "hmac-sha256";
    key_version: string;
    value: string;
};
/** The user making the claim. */
type EvaluationSubject = {
    external_id?: string;
    email: string;
    email_verified?: boolean;
};
/** Everything you send to evaluate one claim. */
type EvaluationRequest = {
    benefit: string;
    claim_id: string;
    subject: EvaluationSubject;
    context?: {
        ip?: string | null;
        user_agent?: string;
        session_id?: string;
    } | null;
    identifiers?: {
        device_id?: string;
        /** The value the browser SDK returned, or `unavailable:not_loaded` when your consent tool kept it from loading. */
        device_token?: string;
        browser_cookie_id?: string;
        payment?: {
            provider: string;
            scope: string;
            fingerprint: string;
        };
        phone_hash?: KeyedHash;
        phone_verified?: boolean;
        custom?: {
            key: string;
            value_hash: KeyedHash;
        }[];
    };
    /** The incoming request your server received for this claim. `evaluate(input, key, { request })` fills it from a Fetch `Request`. */
    request?: IncomingRequest;
};
/** The incoming request your server received: its method, full URL and headers. */
type IncomingRequest = {
    method: string;
    url: string;
    headers: Record<string, string>;
};
/** One row of claim history: a benefit you granted before using AbuseZero. Send `granted_on` (YYYY-MM-DD, in the
 * import's time zone) with an optional `granted_time` (HH:MM or HH:MM:SS), or `occurred_at` with its own offset. */
type ClaimHistoryRow = {
    benefit?: string;
    subject: {
        email: string;
        external_id?: string;
    };
    granted_on?: string;
    granted_time?: string;
    occurred_at?: string;
    claim_id?: string;
    identifiers?: {
        payment?: {
            provider: string;
            scope: string;
            fingerprint: string;
        };
    };
};
/** A claim history import from code. `confirm: true` adds the ready rows as soon as they're checked; otherwise the
 * import waits for review, like one from the dashboard. */
type ClaimHistoryImport = {
    rows: ClaimHistoryRow[];
    benefit?: string;
    time_zone?: string;
    file_name?: string;
    confirm?: boolean;
};
/** A claim history import from a CSV file: returns the import and its upload link. */
type CsvImportInput = {
    benefit?: string;
    time_zone?: string;
    file_name?: string;
    rows?: number;
    payment?: {
        provider: string;
        scope: string;
    };
    confirm?: boolean;
};
type OutcomeState = "assumed_granted" | "awaiting_outcome" | "granted" | "not_granted" | "outcome_unknown" | "reversed";
type Risk = {
    score: number | null;
    band: "low" | "elevated" | "high" | "not_assessed";
};
/** Expiry: send expires_at (exact time) or expires_in_days (whole days, 1-3650), not both. Omit both to never expire. */
/** `benefit_ids` lists the benefits an entry applies to; leave it empty for all benefits. */
type AccessListEntryInput = {
    kind: "allow" | "block";
    type: "email" | "domain" | "ip" | "user" | "device_id";
    reason: string;
    benefit_ids?: string[];
    expires_at?: string | null;
    expires_in_days?: number | null;
};
type AccessListEntryChange = {
    kind?: "allow" | "block";
    benefit_ids?: string[];
    reason?: string;
    expires_at?: string | null;
    expires_in_days?: number | null;
};
type AccessListWarning = {
    code: "blocked_by_domain";
    entry: string;
} | {
    code: "allow_entries_overridden" | "addresses_stay_blocked";
    count: number;
};
type AccessListResults = {
    object: "list";
    data: {
        object: "access_list_result";
        value: string;
        status: "created" | "already_listed" | "invalid";
        id?: string;
        kind?: "allow" | "block";
        reason?: string;
        warnings?: AccessListWarning[];
    }[];
};
type Reason = {
    code: string;
    message: string;
    rule?: string;
} | null;
type SignalAssessment = {
    family: "identity" | "device" | "network" | "benefit_history";
    assessment: "clear" | "elevated" | "high" | "unavailable";
};
type SuppliedInputs = Record<"email" | "ip" | "user_id" | "phone" | "payment" | "device" | "browser", "received" | "missing">;
type EvaluationDryRun = (SkippedEvaluation & {
    object: "evaluation_dry_run";
}) | {
    object: "evaluation_dry_run";
    dry_run: true;
    result: "allow" | "deny";
    risk: Risk;
    reason: Reason;
    inputs: SuppliedInputs;
};
type OutcomeResult = {
    object: "outcome_report";
    evaluation: string;
    state: OutcomeState;
    conflicts: string[];
};
declare class AbuseZeroError extends Error {
    code: string;
    status: number;
    requestId?: string | undefined;
    retryable: boolean;
    /** The error code reference's section for this error, when AbuseZero sent one. */
    docsUrl?: string;
    constructor(code: string, message: string, status: number, requestId?: string | undefined, retryable?: boolean, docsUrl?: string);
}
/** The incoming request as the evaluation's `request` object, which never makes an evaluation invalid: credential headers
 * stay on your server, and the rest is kept within the evaluation's limits and `room`, the bytes it may add to the body. */
declare function incomingRequestFrom(request: Request, room?: number): IncomingRequest;
type Evaluation = (SkippedEvaluation & {
    source: "abusezero";
}) | {
    source: "abusezero";
    id: string;
    result: "allow" | "deny";
    risk: Risk;
    reason: Reason;
    outcome: {
        state: OutcomeState;
        due_at: string | null;
    } | null;
} | {
    source: "local_outage";
    claim_id: string;
    result: "allow" | "deny";
    error: AbuseZeroError;
};
interface Options {
    key?: string;
    accessToken?: string;
    workspace?: string;
    outage: "throw" | "allow" | "deny";
    baseUrl?: string;
    /** Sends every request instead of the SDK's own pooled connections, for example through a proxy. */
    fetch?: typeof fetch;
}
declare class AbuseZero {
    private options;
    private transport;
    private base;
    constructor(options: Options);
    private request;
    /** Evaluates one claim. Pass the incoming Fetch `Request` as `options.request` to send it with the evaluation. */
    evaluate(input: EvaluationRequest, idempotencyKey: string, options?: {
        request?: Request;
    }): Promise<Evaluation>;
    getEvaluation(id: string): Promise<Record<string, unknown>>;
    /** Records what happened to a claim. A denied evaluation accepts only `granted`,
     * with a `reason`, when you delivered the benefit anyway. */
    outcome(id: string, input: {
        outcome: "granted" | "not_granted" | "reversed";
        reason?: string;
        external_outcome_id?: string;
    }, key: string): Promise<OutcomeResult>;
    /** Imports up to 1,000 rows of claim history. The rows are checked in the background, then the import waits for
     * review (`confirmImport`), unless `confirm: true` adds the ready rows right away. */
    importClaimHistory(input: ClaimHistoryImport, key: string): Promise<Record<string, unknown>>;
    getImport(id: string): Promise<Record<string, unknown>>;
    call(path: string, options?: {
        method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
        input?: Record<string, unknown>;
        idempotencyKey?: string;
        timeoutMs?: number;
    }): Promise<Record<string, unknown>>;
    workspaces(): Promise<Record<string, unknown>>;
    /** Who this connection acts for: the person, their role and permissions, the workspace and the granted scopes. An
     * API key names itself instead of a person. */
    me(): Promise<Record<string, unknown>>;
    /** Evaluation history accepts up to 90 days. */
    evaluations(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    /** The benefit keys, results and reasons found in the last `days` days of evaluations (1-90, 7 by default), to filter by. */
    evaluationFilters(input?: {
        days?: number;
    }): Promise<Record<string, unknown>>;
    evaluationGraph(id: string): Promise<Record<string, unknown>>;
    evaluationEvidence(id: string): Promise<Record<string, unknown>>;
    outcomes(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    getOutcome(id: string): Promise<Record<string, unknown>>;
    dryRunEvaluation(input: EvaluationRequest, idempotencyKey: string): Promise<EvaluationDryRun>;
    simulate(input: Record<string, unknown>): Promise<Record<string, unknown>>;
    replay(input: Record<string, unknown>): Promise<Record<string, unknown>>;
    benefits(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    getBenefit(id: string): Promise<Record<string, unknown>>;
    createBenefit(input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    updateBenefit(id: string, input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    deleteBenefit(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    policies(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    getPolicy(id: string): Promise<Record<string, unknown>>;
    createPolicy(input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    updatePolicy(id: string, input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    duplicatePolicy(id: string, input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    deletePolicy(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    accessLists(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    addAccessListEntry(input: AccessListEntryInput & {
        value: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Adds up to 50 values to one allow or block list; each value gets its own result. */
    addAccessListEntries(input: AccessListEntryInput & {
        values: string[];
    }, idempotencyKey: string): Promise<AccessListResults>;
    /** Changes an entry's list, benefits, reason or expiry. Its value and type can't change. */
    updateAccessListEntry(id: string, input: AccessListEntryChange, idempotencyKey: string): Promise<Record<string, unknown>>;
    deleteAccessListEntry(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Looks up a 20-digit ID, an email address or an IP address: the record an ID names, allow and block list entries
     * that match, and how many evaluations in the last 90 days found it. The value is sent in the request body. */
    lookUpIdentifier(value: string): Promise<Record<string, unknown>>;
    customIdentifiers(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    registerCustomIdentifier(input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    deleteCustomIdentifier(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    imports(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    /** Starts a claim history import from a CSV file and returns its upload link. The upload starts the checks. */
    createCsvImport(input: CsvImportInput, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** An import's rows that can't be added: each row's number, problem and field, never its values. */
    listImportProblems(id: string, input?: {
        cursor?: string;
        limit?: number;
    }): Promise<Record<string, unknown>>;
    /** A short-lived link to a CSV of an import's rows with problems: each row's number and problem, never its values. */
    importProblemsDownload(id: string): Promise<Record<string, unknown>>;
    /** Adds an import that's ready to review. Rows that need attention are skipped. */
    confirmImport(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Discards an import before it's confirmed. Nothing from it is added. */
    discardImport(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    exports(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    /** Exports accept up to 90 days. */
    requestExport(input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    dataDeletions(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    dryRunDataDeletion(input: Record<string, unknown>): Promise<Record<string, unknown>>;
    requestDataDeletion(input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** The overview of the last 24 hours: evaluations, API requests and the latest evaluations. */
    overview(): Promise<Record<string, unknown>>;
    /** Analytics accept up to 90 days. */
    analytics(days?: number): Promise<Record<string, unknown>>;
    /** Benefit value: Delivered and Saved totals for up to 90 days, in US dollars unless `currency` names another supported currency. `benefit` is a benefit key. */
    benefitValue(input?: {
        days?: number;
        currency?: string;
        benefit?: string;
    }): Promise<Record<string, unknown>>;
    /** Why claims were denied: denied claims by reason, largest first, for up to 90 days. `benefit` is a benefit key. */
    denialReasons(input?: {
        days?: number;
        benefit?: string;
    }): Promise<Record<string, unknown>>;
    requestLogs(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    auditLogs(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
    browserCollection(): Promise<Record<string, unknown>>;
    updateBrowserCollection(input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** The browser script tag for your pages, with your PUBLISHABLE KEY filled in. */
    browserScript(): Promise<Record<string, unknown>>;
    /** Account status: credits, plan, limits and whether auto-reload is on. */
    accountStatus(): Promise<Record<string, unknown>>;
    /** Integration status: whether keys, the browser script, evaluations, outcomes, webhooks and credits are working, each with what to do next. */
    integrationStatus(): Promise<Record<string, unknown>>;
    /** One page of account events after `cursor`, oldest first. Leave `cursor` out to start from the oldest event kept.
     * With `wait` (0 to 25 seconds), a read that finds nothing waits for the next event. Save `next_cursor` for the next read. */
    events(input?: {
        cursor?: string;
        limit?: number;
        wait?: number;
    }): Promise<EventPage>;
    private eventPage;
    /** Account events as they happen, one page at a time, oldest first. Handle a page's events, then save its `next_cursor`
     * to carry on from there later. Stops when `signal` aborts. Brief outages are waited out. */
    followEvents({ cursor, signal }?: {
        cursor?: string;
        signal?: AbortSignal;
    }): AsyncGenerator<EventPage>;
    /** API keys, newest first. Secrets are never returned; only the publishable key carries its value. */
    apiKeys(input?: {
        limit?: number;
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    /** Creates a secret or restricted key. Its secret is in this response only, so store it right away. Needs `operations:management`. */
    createApiKey(input: {
        name: string;
        type: "secret" | "restricted";
        scopes?: string[];
        expires_in_days?: number | null;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    updateApiKey(id: string, input: {
        name?: string;
        scopes?: string[];
        expires_in_days?: number | null;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Replaces a key. The old key keeps working for `overlap_hours`, and the new secret is in this response only. */
    rollApiKey(id: string, input: {
        overlap_hours: 1 | 24 | 168;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Shows a key's replacement once, when AbuseZero replaced the key for you (`replacement_available`). Its secret is in this response only. */
    showApiKeyReplacement(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    revokeApiKey(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Machine clients and authorized apps need a member's OAuth sign-in (`accessToken`), not an API key. */
    machineClients(input?: {
        view?: "mine" | "everyone";
        limit?: number;
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    createMachineClient(input: {
        name: string;
        scopes: string[];
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    rotateMachineClientSecret(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    revokeMachineClient(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    authorizedApps(input?: {
        view?: "mine" | "everyone";
        limit?: number;
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    disconnectAuthorizedApp(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    members(input?: {
        limit?: number;
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    /** Member changes need a member's OAuth sign-in (`accessToken`), and follow that member's role. */
    updateMember(id: string, input: {
        role?: "admin" | "developer" | "viewer";
        permissions?: string[];
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    removeMember(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    invitations(input?: {
        limit?: number;
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    inviteMember(input: {
        email: string;
        role: "admin" | "developer" | "viewer";
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    resendInvitation(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    cancelInvitation(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    webhookEndpoints(input?: {
        limit?: number;
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    getWebhookEndpoint(id: string): Promise<Record<string, unknown>>;
    /** Adds an endpoint. Its signing secret isn't in the response: read it with `webhookSigningSecret()`. */
    createWebhookEndpoint(input: {
        url: string;
        events: string[];
        benefit_ids?: string[];
        denied_only?: boolean;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Changes the URL, events or benefits. Send the endpoint's current `revision`. */
    updateWebhookEndpoint(id: string, input: {
        revision: number;
        url?: string;
        events?: string[];
        benefit_ids?: string[];
        denied_only?: boolean;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    enableWebhookEndpoint(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    disableWebhookEndpoint(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    deleteWebhookEndpoint(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** The endpoint's current signing secret. Needs `operations:management`, and every read is recorded in the audit trail. */
    webhookSigningSecret(id: string): Promise<Record<string, unknown>>;
    /** A new signing secret. The previous one keeps signing for 24 hours. */
    rotateWebhookSigningSecret(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    sendWebhookTest(id: string, input: {
        type?: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    webhookDeliveries(input?: {
        endpoint_id?: string;
        status?: string;
        type?: string;
        event_id?: string;
        limit?: number;
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    getWebhookDelivery(id: string): Promise<Record<string, unknown>>;
    /** Sends the delivery's event again: to the endpoint's current URL, or with `target: "original"` to the URL it was first sent to. */
    resendWebhookDelivery(id: string, input: {
        target?: "current" | "original";
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Today's deliveries against the daily limit, in UTC days. */
    webhookUsage(): Promise<Record<string, unknown>>;
    /** The plan, its billing period and renewal date, and the workspace's limits. */
    plan(): Promise<Record<string, unknown>>;
    /** Credits and usage: allowance credits, pay-as-you-go credits, protected benefits and team seats. */
    usage(): Promise<Record<string, unknown>>;
    /** Credit history, newest first. Filter by `activity`, `direction`, `days`, or `from` and `to`. */
    creditHistory(input?: {
        cursor?: string;
        activity?: string;
        direction?: "added" | "used";
        days?: 7 | 30 | 90 | 365;
        from?: string;
        to?: string;
    }): Promise<Record<string, unknown>>;
    /** Credits used each day of the last 30 days, in the workspace's time zone. */
    dailyUsage(): Promise<Record<string, unknown>>;
    /** The workspace's Enterprise plans and what each one adds. */
    enterprisePlans(): Promise<Record<string, unknown>>;
    /** What an Enterprise plan code adds, without redeeming it. */
    previewEnterprisePlanCode(code: string): Promise<Record<string, unknown>>;
    /** The workspace owner only, as for every call below: the next charge. */
    upcomingCharge(): Promise<Record<string, unknown>>;
    /** Invoices, newest first, each with its secure payment page link. */
    invoices(input?: {
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    /** Saved payment methods: the default first, then the backup payment methods in order. */
    paymentMethods(): Promise<Record<string, unknown>>;
    billingDetails(): Promise<Record<string, unknown>>;
    /** A payment's progress. `payment_page_url` is set when the bank asks the person to confirm it. */
    getPayment(id: string): Promise<Record<string, unknown>>;
    /** What a plan or billing period change costs now and at renewal. Nothing changes until it's confirmed. */
    quotePlanChange(input: {
        plan: "payg" | "pro" | "scale";
        interval?: "month" | "year" | null;
        promo_code?: string;
    }): Promise<Record<string, unknown>>;
    updateBillingDetails(input: Record<string, unknown>, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** `credits` is the alert level, or null to be alerted by your usage pace. */
    setLowCreditAlert(credits: number | null, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Over your plan limits: keep one benefit or member active and pause another. */
    chooseWhatStaysActive(input: {
        kind: "benefit" | "member";
        keep_active: string;
        pause: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    setAutoReload(input: {
        enabled: boolean;
        threshold: number | null;
        amount_dollars: number | null;
        monthly_cap_dollars?: number | null;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    buyCredits(amountDollars: number, idempotencyKey: string): Promise<Record<string, unknown>>;
    retryCreditPurchase(id: string, input: {
        payment_method_id?: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Confirms a quote for a higher plan on the same or a longer billing period, Builder to Pro or Scale included, or yearly billing on the same plan. */
    changePlan(quoteId: string, input: {
        payment_method_id?: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    undoScheduledDowngrade(idempotencyKey: string): Promise<Record<string, unknown>>;
    resumeSubscription(idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Pays the overdue invoice, or the unpaid invoice with `invoice_number`. */
    payOverdueInvoice(input: {
        invoice_number?: string;
        payment_method_id?: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    setDefaultPaymentMethod(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    moveBackupPaymentMethod(id: string, direction: "up" | "down", idempotencyKey: string): Promise<Record<string, unknown>>;
    /** The default payment method can't be removed. */
    removePaymentMethod(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    redeemEnterprisePlanCode(code: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** With no saved payment method: a link for the owner to add one, or to add one and pay for an upgrade. Give the
     * owner `approval_url`, then read the link's status until it's `completed`, `declined` or `expired`. */
    createBillingApprovalLink(input: {
        kind: "add_payment_method" | "upgrade";
        plan?: "pro" | "scale";
        interval?: "month" | "year";
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    billingApprovalLink(id: string): Promise<Record<string, unknown>>;
    /** The workspace's name, icon, time zone, website, product type and data retention. */
    workspaceSettings(): Promise<Record<string, unknown>>;
    updateWorkspaceSettings(input: WorkspaceSettingsChange, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** `image` is a 256 × 256 WebP of up to 64 KB, base64-encoded. The icon is used once it's checked. */
    uploadWorkspaceIcon(image: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    workspaceIconUpload(id: string): Promise<Record<string, unknown>>;
    removeWorkspaceIcon(idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Shortening retention deletes older evaluation evidence for good. */
    setDataRetention(evidenceDays: number, idempotencyKey: string): Promise<Record<string, unknown>>;
    setupProgress(): Promise<Record<string, unknown>>;
    finishSetup(input: SetupAnswers, idempotencyKey: string): Promise<Record<string, unknown>>;
    dismissSetupGuide(idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Ends your access to the workspace, and this sign-in's. */
    leaveWorkspace(idempotencyKey: string): Promise<Record<string, unknown>>;
    updateAccountName(name: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    emailPreferences(): Promise<Record<string, unknown>>;
    updateEmailPreferences(input: EmailPreferencesChange, idempotencyKey: string): Promise<Record<string, unknown>>;
    notifications(input?: {
        filter?: "all" | "unread";
        cursor?: string;
    }): Promise<Record<string, unknown>>;
    markNotification(id: string, read: boolean, idempotencyKey: string): Promise<Record<string, unknown>>;
    markAllNotificationsRead(idempotencyKey: string): Promise<Record<string, unknown>>;
    runNotificationAction(id: string, action: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    fixImportRow(id: string, row: number, cells: Partial<Record<ImportColumn, string>>, idempotencyKey: string): Promise<Record<string, unknown>>;
    skipImportRow(id: string, row: number, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** The password protects the export's ZIP files. AbuseZero never shows it again, so keep it somewhere safe. */
    requestWorkspaceExport(input: {
        password: string;
        encryption?: "standard" | "aes256";
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    workspaceExport(): Promise<Record<string, unknown>>;
    workspaceExportDownload(id: string): Promise<Record<string, unknown>>;
    deleteWorkspaceExport(id: string, idempotencyKey: string): Promise<Record<string, unknown>>;
    contactSupport(input: SupportTicketInput, idempotencyKey: string): Promise<Record<string, unknown>>;
    supportTickets(input?: {
        cursor?: string;
        limit?: number;
    }): Promise<Record<string, unknown>>;
    sendFeedback(input: {
        message: string;
        page?: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
}
/** Public information: pricing, the developer docs, the blog, the API's references, legal documents, the contact
 * forms and agent onboarding. It needs no key or sign-in. */
declare class AbuseZeroPublic {
    private transport;
    private base;
    constructor(options?: {
        baseUrl?: string;
        fetch?: typeof fetch;
    });
    private request;
    private static path;
    /** Plans and prices, what each plan includes and what every plan shares. */
    pricing(): Promise<Record<string, unknown>>;
    /** The exact price of a plan and period, or of a Builder credit pack, for a new workspace's first purchase. */
    priceQuote(input: {
        plan: "payg" | "pro" | "scale";
        interval?: "month" | "year";
        amount?: number;
    }): Promise<Record<string, unknown>>;
    docs(input?: {
        cursor?: string;
        limit?: number;
    }): Promise<Record<string, unknown>>;
    searchDocs(query: string, limit?: number): Promise<Record<string, unknown>>;
    /** A developer docs page as Markdown, by its path, such as `quickstart` or `api-reference/errors`. */
    docsPage(path: string): Promise<Record<string, unknown>>;
    helpArticles(input?: {
        cursor?: string;
        limit?: number;
    }): Promise<Record<string, unknown>>;
    searchHelp(query: string, limit?: number): Promise<Record<string, unknown>>;
    helpArticle(path: string): Promise<Record<string, unknown>>;
    openapi(): Promise<Record<string, unknown>>;
    actions(): Promise<Record<string, unknown>>;
    errorCodes(): Promise<Record<string, unknown>>;
    reasonCodes(): Promise<Record<string, unknown>>;
    webhookEventTypes(): Promise<Record<string, unknown>>;
    conditions(): Promise<Record<string, unknown>>;
    glossary(): Promise<Record<string, unknown>>;
    legalDocuments(): Promise<Record<string, unknown>>;
    legalDocument(document: "terms" | "privacy" | "cookies" | "acceptable-use" | "dpa" | "refunds"): Promise<Record<string, unknown>>;
    changelog(): Promise<Record<string, unknown>>;
    blogPosts(input?: {
        cursor?: string;
        limit?: number;
    }): Promise<Record<string, unknown>>;
    blogPost(slug: string): Promise<Record<string, unknown>>;
    versions(): Promise<Record<string, unknown>>;
    serviceStatus(): Promise<Record<string, unknown>>;
    contacts(): Promise<Record<string, unknown>>;
    /** Sends a message to the sales team about an Enterprise plan. Retrying with the same key sends nothing new. */
    contactSales(input: {
        name: string;
        email: string;
        message: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Sends a request to support without an account. Retrying with the same key returns the same reference. */
    contactSupport(input: {
        email: string;
        subject: string;
        message: string;
        topic: "account" | "billing" | "integration" | "dashboard" | "other";
        name?: string;
        workspace_id?: string;
        request_id?: string;
    }, idempotencyKey: string): Promise<Record<string, unknown>>;
    /** Starts agent onboarding for a new workspace. Give the person `approval_url`; keep `secret` to yourself. Leave
     * `credit_pack_dollars` out for AbuseZero's default credit pack, and `interval` out for monthly. */
    startOnboarding(input: {
        workspace_name: string;
        plan: "payg" | "pro" | "scale";
        interval?: "month" | "year";
        credit_pack_dollars?: number;
    }): Promise<OnboardingSession>;
    /** An onboarding session's status: `waiting`, `ready`, `collected`, `declined` or `expired`. With `wait`, up to 25
     * seconds, it waits for the person. Once it's `ready`, collect the sign-in from `sign_in.token_endpoint`. */
    onboardingStatus(id: string, input: {
        secret: string;
        wait?: number;
    }): Promise<OnboardingStatus>;
}
/** A new onboarding session. `secret` appears only here. */
type OnboardingSession = {
    object: "onboarding_session";
    id: string;
    approval_url: string;
    secret: string;
    expires_at: string;
    workspace_name: string;
    plan: "payg" | "pro" | "scale";
    interval: "month" | "year" | null;
    credit_pack_dollars: number | null;
    amount_cents: number;
};
/** Where an onboarding session stands, and once the person paid, how to collect the sign-in for the new workspace. */
type OnboardingStatus = {
    object: "onboarding_session";
    id: string;
    status: "waiting" | "ready" | "collected" | "declined" | "expired";
    expires_at: string;
    workspace: string | null;
    sign_in: {
        token_endpoint: string;
        grant_type: string;
        client_id: string;
    } | null;
};
/** A page of the events feed. Each event has the same shape as a webhook request's body. */
type EventPage = {
    object: "list";
    data: WebhookEvent[];
    next_cursor: string;
    has_more: boolean;
};
/** Workspace settings to change: send only the ones that change. `null` clears the website or product type. */
type WorkspaceSettingsChange = {
    name?: string;
    website?: string | null;
    product_type?: ProductType | null;
    time_zone?: string;
};
/** What the workspace protects. `other` takes a short description. */
type ProductType = {
    type: "ai_app" | "media_generation" | "developer_tool" | "b2b_saas" | "consumer_app" | "marketplace" | "game" | "other";
    other?: string;
};
/** Finish setting up's answers. Each one is optional. */
type SetupAnswers = {
    website?: string | null;
    product_type?: ProductType | null;
    time_zone?: string | null;
};
/** The optional emails you can turn off. Sign-in, security and billing emails always go. */
type EmailPreferencesChange = {
    members_and_invitations?: boolean;
    imports_and_exports?: boolean;
    integration_alerts?: boolean;
    weekly_summary?: boolean;
};
/** A claim history CSV column, as an import's problems name them. */
type ImportColumn = "email" | "benefit" | "granted_on" | "granted_time" | "occurred_at" | "user_id" | "claim_id" | "payment_fingerprint";
type SupportTicketInput = {
    subject: string;
    message: string;
    topic: "account" | "billing" | "integration" | "dashboard" | "other";
    request_id?: string;
};
type HashOptions = {
    secret: string | Uint8Array;
    keyVersion: string;
};
declare function createPhoneHash(options: HashOptions & {
    e164: string;
}): {
    algorithm: "hmac-sha256";
    key_version: string;
    value: string;
};
declare function createCustomIdentifier(options: HashOptions & {
    key: string;
    value: string;
}): {
    key: string;
    value_hash: {
        algorithm: "hmac-sha256";
        key_version: string;
        value: string;
    };
};

export { AbuseZero, AbuseZeroError, AbuseZeroPublic, type AccessListEntryChange, type AccessListEntryInput, type AccessListResults, type AccessListWarning, type ClaimHistoryImport, type ClaimHistoryRow, type CsvImportInput, type EmailPreferencesChange, type Evaluation, type EvaluationDryRun, type EvaluationRequest, type EvaluationSubject, type EventPage, type ImportColumn, type IncomingRequest, type KeyedHash, type KnownSkippedReason, type OnboardingSession, type OnboardingStatus, type Options, type OutcomeResult, type OutcomeState, type ProductType, type Reason, type Risk, type SetupAnswers, type SignalAssessment, type SkippedEvaluation, type SuppliedInputs, type SupportTicketInput, type WebhookEvent, WebhookVerificationError, type WorkspaceSettingsChange, createCustomIdentifier, createPhoneHash, incomingRequestFrom, verifyWebhook };
