package pl.mpospieszynski.site.shared.storage;

/**
 * An image as public responses describe it: the `/media/...` URL, alt text in the response language and
 * the pixel size (for `width`/`height` attributes, so pages don't shift while images load).
 */
public record MediaRef(String url, String alt, Integer width, Integer height) {

    /** URL under which {@link MediaController} serves a stored object. */
    public static String urlFor(String storageKey) {
        return "/media/" + storageKey;
    }
}
