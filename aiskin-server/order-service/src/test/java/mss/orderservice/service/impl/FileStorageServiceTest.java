package mss.orderservice.service.impl;
import mss.orderservice.service.*;


import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileStorageServiceTest {

    @TempDir
    Path uploadDirectory;

    private IFileStorageService service;

    @BeforeEach
    void setUp() {
        service = new FileStorageService();
        ReflectionTestUtils.setField(service, "uploadDir", uploadDirectory.toString());
    }

    @Test
    void storesValidPngUsingGeneratedFileName() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "evidence.png", "image/png", validPng());
        String url = service.storeEvidenceImage(file);
        assertThat(url).startsWith("/api/orders/uploads/").endsWith(".png");
        assertThat(Files.list(uploadDirectory)).hasSize(1);
    }

    @Test
    void rejectsExecutableContentDisguisedAsImage() {
        MockMultipartFile file = new MockMultipartFile("file", "evidence.png", "image/png", "<script>alert(1)</script>".getBytes());
        assertThatThrownBy(() -> service.storeEvidenceImage(file)).isInstanceOfSatisfying(ResponseStatusException.class, exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void rejectsUnsupportedImageType() {
        MockMultipartFile file = new MockMultipartFile("file", "evidence.svg", "image/svg+xml", "<svg/>".getBytes());
        assertThatThrownBy(() -> service.storeEvidenceImage(file)).isInstanceOfSatisfying(ResponseStatusException.class, exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE));
    }

    @Test
    void rejectsOversizedImageBeforeDecoding() {
        MockMultipartFile file = new MockMultipartFile("file", "large.jpg", "image/jpeg", new byte[(int) FileStorageService.MAX_FILE_SIZE + 1]);
        assertThatThrownBy(() -> service.storeEvidenceImage(file)).isInstanceOfSatisfying(ResponseStatusException.class, exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE));
    }

    private byte[] validPng() throws Exception {
        BufferedImage image = new BufferedImage(64, 64, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}


