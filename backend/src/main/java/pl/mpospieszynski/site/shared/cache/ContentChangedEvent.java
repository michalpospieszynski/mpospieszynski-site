package pl.mpospieszynski.site.shared.cache;

/**
 * Published by every admin write. After the transaction commits, all public read caches are cleared,
 * so visitors never see content older than the last save. `source` is for logging only.
 */
public record ContentChangedEvent(String source) {
}
