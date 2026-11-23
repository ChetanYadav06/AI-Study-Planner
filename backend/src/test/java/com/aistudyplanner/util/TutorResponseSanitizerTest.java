package com.aistudyplanner.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TutorResponseSanitizerTest {

    @Test
    void testSanitizeGenerativeAiWithFullIntroParagraphs() {
        String raw = "Hello! I am so excited to help you dive into the world of Computer Science.\n\n" +
                "Today, we are tackling one of the most exciting and rapidly growing fields in technology.\n\n" +
                "Let's break this down into clear, structured concepts so you can master it!\n\n" +
                "---\n\n" +
                "Generative AI is a branch of Artificial Intelligence that focuses on creating new content, including text, images, code, audio, and synthetic data.\n\n" +
                "### Core Architecture\n" +
                "- Built on Foundation Models and Transformer architectures.\n" +
                "- Uses self-attention to generate high-quality outputs.";

        String clean = TutorResponseSanitizer.sanitize(raw);

        assertTrue(clean.startsWith("Generative AI is a branch of Artificial Intelligence"),
                "Response should start directly with definition, but was: " + clean);
        assertFalse(clean.contains("Hello!"), "Should not contain Hello!");
        assertFalse(clean.contains("I am so excited"), "Should not contain excitement filler");
        assertFalse(clean.contains("Today, we are tackling"), "Should not contain agenda filler");
        assertFalse(clean.contains("Let's break this down"), "Should not contain break down filler");
    }

    @Test
    void testSanitizeJavaWithInlineGreatQuestion() {
        String raw = "Great question! Java is a high-level, class-based, object-oriented programming language designed to have as few implementation dependencies as possible.\n\n" +
                "### Key Characteristics\n" +
                "- **Platform Independence**: Compiles to bytecode executed by JVM.";

        String clean = TutorResponseSanitizer.sanitize(raw);

        assertTrue(clean.startsWith("Java is a high-level"),
                "Response should start directly with Java definition, but was: " + clean);
        assertFalse(clean.contains("Great question!"));
    }

    @Test
    void testSanitizeCompilerDesignWithAsYourAiTutorAndTrailingFiller() {
        String raw = "Hello there! As your AI Study Tutor, I love this question. It's a fantastic computer science concept to explore, especially since you are currently diving into Spring Boot and REST API Development! 🚀\n\n" +
                "Let's break down Compiler Design in a clear, structured way, connect it to the tools you use every day, and see why it matters to a Java/Spring Boot developer.\n\n" +
                "---\n\n" +
                "Compiler Design is the study of how software translators convert source code written in a high-level programming language into machine code or bytecode.\n\n" +
                "## Phases of a Compiler\n" +
                "1. Lexical Analysis (Scanning)\n" +
                "2. Syntax Analysis (Parsing)\n\n" +
                "How are you feeling about this breakdown? Would you like to dive deeper into how Java's specific compilation process works, or shall we jump back into building out your Spring Boot REST endpoints? Let me know! 🚀";

        String clean = TutorResponseSanitizer.sanitize(raw);

        assertTrue(clean.startsWith("Compiler Design is the study of how software translators"),
                "Should start directly with Compiler Design definition, but was: " + clean);
        assertFalse(clean.contains("Hello there!"));
        assertFalse(clean.contains("As your AI Study Tutor"));
        assertFalse(clean.contains("Spring Boot and REST API Development! 🚀"));
        assertFalse(clean.contains("How are you feeling about this breakdown?"));
        assertTrue(clean.contains("Phases of a Compiler"));
    }

    @Test
    void testSanitizeQuizRequest() {
        String raw = "Hello there! Welcome to your AI Study Planner quiz session. 🌲 🧠\n\n" +
                "Tree fundamentals and recursion are cornerstone topics in computer science.\n\n" +
                "Grab a piece of paper, jot down your answers (A, B, C, or D), and check your score at the bottom!\n\n" +
                "---\n\n" +
                "### Question 1: Binary Tree Properties\n" +
                "Consider a strictly binary tree that contains a total of $31$ nodes. What is the number of leaf nodes?";

        String clean = TutorResponseSanitizer.sanitize(raw);

        assertTrue(clean.startsWith("### Question 1: Binary Tree Properties") ||
                   clean.startsWith("Tree fundamentals and recursion are cornerstone topics"),
                "Should jump directly into quiz or subject context without greeting or paper filler: " + clean);
        assertFalse(clean.contains("Hello there!"));
        assertFalse(clean.contains("Welcome to your AI Study Planner quiz session"));
        assertFalse(clean.contains("Grab a piece of paper"));
    }

    @Test
    void testCleanResponseNotModified() {
        String cleanAlready = "Database Management System (DBMS) is software that manages databases, providing data definition, manipulation, and administration.\n\n" +
                "### Core Functions\n" +
                "- **ACID Compliance**: Ensures Atomicity, Consistency, Isolation, and Durability.\n" +
                "- **Data Abstraction**: Hides complex hardware storage details.";

        String result = TutorResponseSanitizer.sanitize(cleanAlready);

        assertEquals(cleanAlready, result);
    }

    @Test
    void testSanitizeDifferenceBetweenStackAndQueue() {
        String raw = "Certainly! Here is the difference between Stack and Queue.\n\n" +
                "The fundamental difference between a Stack and a Queue is their element processing order: a Stack operates on LIFO (Last In, First Out), whereas a Queue operates on FIFO (First In, First Out).\n\n" +
                "| Feature | Stack | Queue |\n" +
                "| :--- | :--- | :--- |\n" +
                "| Order | LIFO | FIFO |\n" +
                "| Insertion | Push | Enqueue |\n" +
                "| Deletion | Pop | Dequeue |";

        String clean = TutorResponseSanitizer.sanitize(raw);

        assertTrue(clean.startsWith("The fundamental difference between a Stack and a Queue"),
                "Should start directly with comparison difference, but was: " + clean);
        assertFalse(clean.contains("Certainly!"));
        assertTrue(clean.contains("| Feature | Stack | Queue |"));
    }
}
