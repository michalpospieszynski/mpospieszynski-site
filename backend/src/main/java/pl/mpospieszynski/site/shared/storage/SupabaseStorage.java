package pl.mpospieszynski.site.shared.storage;

import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Supabase Storage over its REST API (`{SUPABASE_URL}/storage/v1`). Reads use the public bucket URL;
 * writes and deletes send the publishable key plus the admin's own JWT, which the bucket policy authorises.
 */
public class SupabaseStorage implements MediaStorage {

    private final RestClient http;
    private final String bucket;

    public SupabaseStorage(RestClient.Builder builder, StorageProperties properties) {
        this.bucket = properties.bucket();
        this.http = builder
                .baseUrl(properties.supabaseUrl() + "/storage/v1")
                .defaultHeader("apikey", properties.publishableKey())
                .build();
    }

    @Override
    public void put(String key, byte[] content, MediaType contentType, String adminJwt) {
        http.post()
                .uri("/object/{bucket}/{key}", bucket, MediaStorage.requireValidKey(key))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt)
                .header("x-upsert", "false")
                .contentType(contentType)
                .body(content)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public Optional<StoredObject> get(String key) {
        try {
            ResponseEntity<byte[]> response = http.get()
                    .uri("/object/public/{bucket}/{key}", bucket, MediaStorage.requireValidKey(key))
                    .retrieve()
                    .toEntity(byte[].class);
            MediaType type = Optional.ofNullable(response.getHeaders().getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM);
            return Optional.ofNullable(response.getBody()).map(body -> new StoredObject(body, type));
        } catch (HttpClientErrorException e) {
            // Supabase answers a missing object with 404, or 400 "Object not found" on some versions.
            if (e.getStatusCode() == HttpStatus.NOT_FOUND || e.getStatusCode() == HttpStatus.BAD_REQUEST) {
                return Optional.empty();
            }
            throw e;
        }
    }

    @Override
    public void delete(String key, String adminJwt) {
        http.delete()
                .uri("/object/{bucket}/{key}", bucket, MediaStorage.requireValidKey(key))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwt)
                .retrieve()
                .toBodilessEntity();
    }
}
