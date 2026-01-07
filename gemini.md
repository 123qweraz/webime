# Gemini Development Philosophy

This document outlines the core principles that should guide the development of this project, especially when using AI assistants like Gemini. The philosophy is heavily inspired by the Unix philosophy.

## 1. Do One Thing and Do It Well
Each program, function, or component should focus on a single task. It should solve one problem well, not multiple problems poorly. When adding new features, prefer creating small, focused functions over adding more complexity to existing ones.

## 2. Write Programs that Work Together
Design components to be interoperable. They should be able to be connected with other components. For a web application, this means clear separation between UI, state management, and business logic. For AI-assisted coding, this means generating modular, reusable code snippets that can be easily integrated.

## 3. Write Programs to Handle Text Streams, as they are a Universal Interface
While not always directly applicable to web UI development, the principle of a universal interface is key. In our context, this translates to well-defined data structures (like the JSON dictionaries) and APIs between components. Keep data formats simple and predictable.

## 4. Build a Prototype as Soon as Possible
Get a working version running early, even if it's not perfect. It is easier to polish a working prototype than to debug a complex, non-working system. Iterate and refine. This is especially true for AI-driven development where rapid prototyping can quickly validate ideas.

## 5. Prefer Portability Over Efficiency
In the context of this web application, this means prioritizing standard, cross-browser technologies (HTML, CSS, JavaScript) over proprietary or highly-specific ones. Code should be easy to understand and maintain, even if it's not the absolute most performant solution. Clarity is king.

## 6. Store Data in Flat Text Files
Our dictionary format (`.json` files) already follows this principle. This makes the data easy to read, edit, debug, and use with other tools. Avoid complex binary data formats.

## 7. Use Shell Scripts to Increase Leverage and Portability
For build processes or data manipulation (like the Python script for merging dictionaries), using scripts automates repetitive tasks and makes the development process more robust.

## 8. Avoid Captive User Interfaces
The user should be in control. While we are building a UI, it should be responsive, intuitive, and not lock the user into a specific workflow if it can be avoided. (The user's feedback about the full-screen practice mode is a perfect example of this principle in action).

## 9. Make Every Program a Filter
This is the idea of "input -> process -> output". Each function should take some data, transform it, and return the result, minimizing side effects. This makes code easier to test and reason about.
ru guo wo shuru ge zi henshao, zhiyou yihang lianghang, yinggai xian gen wo mingque xuqiu
ni ziji bu yao git commit, tixing wo git jiuhao, meici xiugai qian, quebao git shi clean, bu clean jiu tixing wo, gai commit le
gongzuo yao liuhen, he yonghu de duihua yinggai baocun dao dangqian mulu de history dialog md wenjian ba guanjian caozuo, dade gaidong jilu xialai
