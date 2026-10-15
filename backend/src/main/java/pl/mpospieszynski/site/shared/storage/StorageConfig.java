package pl.mpospieszynski.site.shared.storage;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
class StorageConfig {

    @Bean
    MediaStorage mediaStorage(StorageProperties properties) {
        return properties.local()
                ? new LocalDiskStorage(properties.localDir())
                : new SupabaseStorage(RestClient.builder(), properties);
    }
}
