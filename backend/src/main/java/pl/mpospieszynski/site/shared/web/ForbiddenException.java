package pl.mpospieszynski.site.shared.web;

/** 403: the request was understood but refused (e.g. the bot check failed). */
public class ForbiddenException extends SiteException {

    public ForbiddenException(String messageKey, Object... messageArgs) {
        super(messageKey, messageArgs);
    }
}
