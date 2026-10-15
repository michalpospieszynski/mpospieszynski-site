package pl.mpospieszynski.site.shared.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.nio.file.Path;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestClient;

/** B5: local storage round trip, Supabase Storage requests against a mocked server, and /media/{key}. */
class MediaStorageTests {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G'};

    @Nested
    class Local {

        @TempDir
        Path dir;

        @Test
        void storesReadsAndDeletesAFile() {
            LocalDiskStorage storage = new LocalDiskStorage(dir);

            storage.put("cover-1a2b.png", PNG, MediaType.IMAGE_PNG, null);
            MediaStorage.StoredObject stored = storage.get("cover-1a2b.png").orElseThrow();
            assertThat(stored.content()).isEqualTo(PNG);
            assertThat(stored.contentType()).isEqualTo(MediaType.IMAGE_PNG);

            storage.delete("cover-1a2b.png", null);
            assertThat(storage.get("cover-1a2b.png")).isEmpty();
        }

        @Test
        void refusesKeysThatCouldLeaveTheFolder() {
            LocalDiskStorage storage = new LocalDiskStorage(dir);
            assertThatThrownBy(() -> storage.get("../secret.png")).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> storage.put("a/b.png", PNG, MediaType.IMAGE_PNG, null)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    class Supabase {

        private final RestClient.Builder builder = RestClient.builder();
        private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        private final SupabaseStorage storage = new SupabaseStorage(builder, new StorageProperties(
                "supabase", URI.create("https://project.supabase.co"), "media", "publishable-key", null));

        @Test
        void uploadsWithTheAdminTokenAndThePublishableKey() {
            server.expect(requestTo("https://project.supabase.co/storage/v1/object/media/cover.png"))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(header("Authorization", "Bearer admin-jwt"))
                    .andExpect(header("apikey", "publishable-key"))
                    .andExpect(header("Content-Type", "image/png"))
                    .andExpect(content().bytes(PNG))
                    .andRespond(withSuccess());

            storage.put("cover.png", PNG, MediaType.IMAGE_PNG, "admin-jwt");
            server.verify();
        }

        @Test
        void readsFromThePublicBucketUrl() {
            server.expect(requestTo("https://project.supabase.co/storage/v1/object/public/media/cover.png"))
                    .andExpect(method(HttpMethod.GET))
                    .andRespond(withSuccess(PNG, MediaType.IMAGE_PNG));

            MediaStorage.StoredObject stored = storage.get("cover.png").orElseThrow();
            assertThat(stored.content()).isEqualTo(PNG);
            assertThat(stored.contentType()).isEqualTo(MediaType.IMAGE_PNG);
        }

        @Test
        void treatsAMissingObjectAsEmpty() {
            server.expect(requestTo("https://project.supabase.co/storage/v1/object/public/media/gone.png"))
                    .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":\"not_found\"}"));

            assertThat(storage.get("gone.png")).isEmpty();
        }

        @Test
        void deletesWithTheAdminToken() {
            server.expect(requestTo("https://project.supabase.co/storage/v1/object/media/cover.png"))
                    .andExpect(method(HttpMethod.DELETE))
                    .andExpect(header("Authorization", "Bearer admin-jwt"))
                    .andRespond(withSuccess());

            storage.delete("cover.png", "admin-jwt");
            server.verify();
        }
    }

    @Nested
    class Controller {

        @TempDir
        Path dir;

        @Test
        void servesAFileWithLongLivedCacheHeaders() throws Exception {
            LocalDiskStorage storage = new LocalDiskStorage(dir);
            storage.put("cover.png", PNG, MediaType.IMAGE_PNG, null);
            MockMvc mvc = MockMvcBuilders.standaloneSetup(new MediaController(storage)).build();

            mvc.perform(get("/media/cover.png"))
                    .andExpect(status().isOk())
                    .andExpect(MockMvcResultMatchers.content().contentType(MediaType.IMAGE_PNG))
                    .andExpect(MockMvcResultMatchers.header().string("Cache-Control", "max-age=31536000, public, immutable"))
                    .andExpect(MockMvcResultMatchers.header().string("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox"))
                    .andExpect(MockMvcResultMatchers.content().bytes(PNG));
            mvc.perform(get("/media/missing.png")).andExpect(status().isNotFound());
            mvc.perform(get("/media/..png")).andExpect(status().isNotFound());
        }
    }
}
