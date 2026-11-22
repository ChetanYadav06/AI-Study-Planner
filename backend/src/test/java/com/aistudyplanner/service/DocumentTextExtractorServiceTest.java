package com.aistudyplanner.service;

import com.aistudyplanner.dto.ExtractedDocumentDto;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class DocumentTextExtractorServiceTest {

    private DocumentTextExtractorService extractorService;

    @BeforeEach
    void setUp() {
        extractorService = new DocumentTextExtractorService();
    }

    @Test
    @DisplayName("Should successfully extract text from TXT and MD files")
    void testExtractPlainTextAndMarkdown() throws Exception {
        String content = "# Advanced Algorithms\nBinary Search Trees and Dynamic Programming.";
        MockMultipartFile mdFile = new MockMultipartFile("file", "notes.md", "text/markdown", content.getBytes(StandardCharsets.UTF_8));

        ExtractedDocumentDto dto = extractorService.extractText(mdFile);
        assertNotNull(dto);
        assertEquals("notes.md", dto.getFileName());
        assertEquals("MD", dto.getFileType());
        assertTrue(dto.getContent().contains("Advanced Algorithms"));
        assertNull(dto.getWarning());

        MockMultipartFile txtFile = new MockMultipartFile("file", "summary.txt", "text/plain", "Simple summary notes.".getBytes(StandardCharsets.UTF_8));
        ExtractedDocumentDto txtDto = extractorService.extractText(txtFile);
        assertEquals("TXT", txtDto.getFileType());
        assertEquals("Simple summary notes.", txtDto.getContent());
    }

    @Test
    @DisplayName("Should extract text from generated PDF document")
    void testExtractPdf() throws Exception {
        byte[] pdfBytes;
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText("Data Structures & Algorithms in Java");
                stream.endText();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            pdfBytes = baos.toByteArray();
        }

        MockMultipartFile pdfFile = new MockMultipartFile("file", "lecture.pdf", "application/pdf", pdfBytes);
        ExtractedDocumentDto result = extractorService.extractText(pdfFile);

        assertNotNull(result);
        assertEquals("PDF", result.getFileType());
        assertEquals("lecture.pdf", result.getFileName());
        assertTrue(result.getContent().contains("Data Structures & Algorithms in Java"));
        assertEquals(1, result.getPageOrSlideCount());
        assertNull(result.getWarning());
    }

    @Test
    @DisplayName("Should extract paragraphs from generated DOCX document")
    void testExtractDocx() throws Exception {
        byte[] docxBytes;
        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            XWPFParagraph p = doc.createParagraph();
            XWPFRun r = p.createRun();
            r.setText("Spring Boot Microservices Architecture and REST APIs");
            doc.write(baos);
            docxBytes = baos.toByteArray();
        }

        MockMultipartFile docxFile = new MockMultipartFile(
                "file", "lecture.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        ExtractedDocumentDto result = extractorService.extractText(docxFile);
        assertNotNull(result);
        assertEquals("DOCX", result.getFileType());
        assertTrue(result.getContent().contains("Spring Boot Microservices Architecture"));
        assertNull(result.getWarning());
    }

    @Test
    @DisplayName("Should extract slide text from generated PPTX presentation")
    void testExtractPptx() throws Exception {
        byte[] pptxBytes;
        try (XMLSlideShow pptx = new XMLSlideShow();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            XSLFSlide slide = pptx.createSlide();
            XSLFTextBox textBox = slide.createTextBox();
            textBox.setText("Introduction to Neural Networks and Deep Learning");
            pptx.write(baos);
            pptxBytes = baos.toByteArray();
        }

        MockMultipartFile pptxFile = new MockMultipartFile(
                "file", "presentation.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                pptxBytes
        );

        ExtractedDocumentDto result = extractorService.extractText(pptxFile);
        assertNotNull(result);
        assertEquals("PPTX", result.getFileType());
        assertTrue(result.getContent().contains("Neural Networks and Deep Learning"));
        assertEquals(1, result.getPageOrSlideCount());
        assertNull(result.getWarning());
    }

    @Test
    @DisplayName("Should reject file exceeding 15 MB")
    void testRejectOversizedFile() {
        byte[] fakeHugeData = new byte[100];
        MockMultipartFile hugeFile = new MockMultipartFile("file", "large.pdf", "application/pdf", fakeHugeData) {
            @Override
            public long getSize() {
                return 16L * 1024L * 1024L; // 16 MB
            }
        };

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> extractorService.extractText(hugeFile));
        assertTrue(ex.getMessage().contains("15 MB"));
    }

    @Test
    @DisplayName("Should reject unsupported file formats like .exe, .zip")
    void testRejectUnsupportedFormat() {
        MockMultipartFile zipFile = new MockMultipartFile("file", "archive.zip", "application/zip", "dummy".getBytes());
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> extractorService.extractText(zipFile));
        assertTrue(ex.getMessage().contains("Unsupported file format"));
    }
}
