package com.aistudyplanner.service;

import com.aistudyplanner.dto.ExtractedDocumentDto;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hslf.usermodel.HSLFSlide;
import org.apache.poi.hslf.usermodel.HSLFSlideShow;
import org.apache.poi.hslf.usermodel.HSLFTextShape;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class DocumentTextExtractorService {

    public static final long MAX_FILE_SIZE = 15L * 1024L * 1024L; // 15 MB

    public ExtractedDocumentDto extractText(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot process an empty or missing file.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File exceeds the maximum allowable limit of 15 MB.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String extension = getFileExtension(originalFilename).toLowerCase();

        switch (extension) {
            case "pdf":
                return extractPdf(file, originalFilename);
            case "docx":
                return extractDocx(file, originalFilename);
            case "doc":
                return extractDoc(file, originalFilename);
            case "pptx":
                return extractPptx(file, originalFilename);
            case "ppt":
                return extractPpt(file, originalFilename);
            case "txt":
            case "md":
                return extractPlainText(file, originalFilename, extension.toUpperCase());
            default:
                throw new IllegalArgumentException("Unsupported file format ." + extension + ". Supported formats: PDF, PPT, PPTX, DOC, DOCX, TXT, MD.");
        }
    }

    private ExtractedDocumentDto extractPdf(MultipartFile file, String filename) throws Exception {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            if (document.isEncrypted()) {
                AccessPermission ap = document.getCurrentAccessPermission();
                if (!ap.canExtractContent()) {
                    throw new SecurityException("This PDF document is encrypted or password-protected and permissions do not allow content extraction.");
                }
            }

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);
            int pageCount = document.getNumberOfPages();

            String warning = null;
            if (text == null || text.trim().isEmpty()) {
                warning = "Text extraction was unsuccessful. This PDF may be a scanned document or image without selectable text.";
                text = "";
            } else {
                text = text.trim();
            }

            return new ExtractedDocumentDto(filename, "PDF", file.getSize(), text, pageCount, warning);
        }
    }

    private ExtractedDocumentDto extractDocx(MultipartFile file, String filename) throws Exception {
        try (InputStream is = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(is);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {

            String text = extractor.getText();
            String warning = null;
            if (text == null || text.trim().isEmpty()) {
                warning = "Document contains no readable text paragraphs or tables.";
                text = "";
            } else {
                text = text.trim();
            }

            int paragraphCount = doc.getParagraphs().size();
            return new ExtractedDocumentDto(filename, "DOCX", file.getSize(), text, paragraphCount, warning);
        }
    }

    private ExtractedDocumentDto extractDoc(MultipartFile file, String filename) throws Exception {
        try (InputStream is = file.getInputStream();
             HWPFDocument doc = new HWPFDocument(is);
             WordExtractor extractor = new WordExtractor(doc)) {

            String text = extractor.getText();
            String warning = null;
            if (text == null || text.trim().isEmpty()) {
                warning = "Document contains no readable text.";
                text = "";
            } else {
                text = text.trim();
            }

            return new ExtractedDocumentDto(filename, "DOC", file.getSize(), text, 1, warning);
        }
    }

    private ExtractedDocumentDto extractPptx(MultipartFile file, String filename) throws Exception {
        try (InputStream is = file.getInputStream();
             XMLSlideShow pptx = new XMLSlideShow(is)) {

            List<XSLFSlide> slides = pptx.getSlides();
            StringBuilder sb = new StringBuilder();
            int slideNum = 1;

            for (XSLFSlide slide : slides) {
                sb.append("--- Slide ").append(slideNum).append(" ---\n");
                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape) {
                        XSLFTextShape textShape = (XSLFTextShape) shape;
                        String t = textShape.getText();
                        if (t != null && !t.isBlank()) {
                            sb.append(t.trim()).append("\n");
                        }
                    }
                }
                sb.append("\n");
                slideNum++;
            }

            String text = sb.toString().trim();
            String warning = null;
            if (text.isEmpty() || text.matches("^(--- Slide \\d+ ---\\s*)+$")) {
                warning = "Presentation contains no readable slide text or consists solely of images/graphics.";
                text = "";
            }

            return new ExtractedDocumentDto(filename, "PPTX", file.getSize(), text, slides.size(), warning);
        }
    }

    private ExtractedDocumentDto extractPpt(MultipartFile file, String filename) throws Exception {
        try (InputStream is = file.getInputStream();
             HSLFSlideShow ppt = new HSLFSlideShow(is)) {

            List<HSLFSlide> slides = ppt.getSlides();
            StringBuilder sb = new StringBuilder();
            int slideNum = 1;

            for (HSLFSlide slide : slides) {
                sb.append("--- Slide ").append(slideNum).append(" ---\n");
                for (org.apache.poi.hslf.usermodel.HSLFShape shape : slide.getShapes()) {
                    if (shape instanceof HSLFTextShape) {
                        HSLFTextShape textShape = (HSLFTextShape) shape;
                        String t = textShape.getText();
                        if (t != null && !t.isBlank()) {
                            sb.append(t.trim()).append("\n");
                        }
                    }
                }
                sb.append("\n");
                slideNum++;
            }

            String text = sb.toString().trim();
            String warning = null;
            if (text.isEmpty() || text.matches("^(--- Slide \\d+ ---\\s*)+$")) {
                warning = "Presentation contains no readable slide text or consists solely of images/graphics.";
                text = "";
            }

            return new ExtractedDocumentDto(filename, "PPT", file.getSize(), text, slides.size(), warning);
        }
    }

    private ExtractedDocumentDto extractPlainText(MultipartFile file, String filename, String type) throws Exception {
        byte[] bytes = file.getBytes();
        String text = new String(bytes, StandardCharsets.UTF_8).trim();
        String warning = null;
        if (text.isEmpty()) {
            warning = "Uploaded text file is empty.";
        }
        return new ExtractedDocumentDto(filename, type, file.getSize(), text, 1, warning);
    }

    private String getFileExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        return filename.substring(dot + 1);
    }
}
