package com.aistudyplanner.dto;

public class ExtractedDocumentDto {
    private String fileName;
    private String fileType;
    private long fileSize;
    private String content;
    private int pageOrSlideCount;
    private String warning;

    public ExtractedDocumentDto() {
    }

    public ExtractedDocumentDto(String fileName, String fileType, long fileSize, String content, int pageOrSlideCount, String warning) {
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.content = content;
        this.pageOrSlideCount = pageOrSlideCount;
        this.warning = warning;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public int getPageOrSlideCount() {
        return pageOrSlideCount;
    }

    public void setPageOrSlideCount(int pageOrSlideCount) {
        this.pageOrSlideCount = pageOrSlideCount;
    }

    public String getWarning() {
        return warning;
    }

    public void setWarning(String warning) {
        this.warning = warning;
    }
}
