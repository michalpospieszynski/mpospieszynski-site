package pl.mpospieszynski.site.shared.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;

/** Dev-profile storage in a local folder, so media works offline. The content type comes from the key's extension. */
public class LocalDiskStorage implements MediaStorage {

    private final Path root;

    public LocalDiskStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create the media folder " + this.root, e);
        }
    }

    @Override
    public void put(String key, byte[] content, MediaType contentType, String adminJwt) {
        try {
            Files.write(file(key), content);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public Optional<StoredObject> get(String key) {
        Path file = file(key);
        if (!Files.isRegularFile(file)) {
            return Optional.empty();
        }
        try {
            MediaType type = MediaTypeFactory.getMediaType(key).orElse(MediaType.APPLICATION_OCTET_STREAM);
            return Optional.of(new StoredObject(Files.readAllBytes(file), type));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String key, String adminJwt) {
        try {
            Files.deleteIfExists(file(key));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private Path file(String key) {
        Path file = root.resolve(MediaStorage.requireValidKey(key)).normalize();
        if (!file.getParent().equals(root)) {
            throw new IllegalArgumentException("Invalid media key: " + key);
        }
        return file;
    }
}
