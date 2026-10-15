package pl.mpospieszynski.site.shared.web;

/**
 * Base for the exceptions features throw; ProblemDetailAdvice turns them into RFC 9457 responses whose
 * `detail` is the message `messageKey` (messages*.properties) in the request's language.
 */
public abstract class SiteException extends RuntimeException {

    private final String messageKey;
    private final transient Object[] messageArgs;

    protected SiteException(String messageKey, Object... messageArgs) {
        super(messageKey);
        this.messageKey = messageKey;
        this.messageArgs = messageArgs;
    }

    public String messageKey() {
        return messageKey;
    }

    public Object[] messageArgs() {
        return messageArgs.clone();
    }
}
