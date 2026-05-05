---
layout: "../../layouts/BlogPostLayout.astro"
title: Why did I switch to Astro?
date: 2023-02-07
author: Burak Sümer
image:
  { src: "/images/astro.webp", alt: "Astronaut image resembling Astro.build" }
description: I switched from Ghost to Astro for my blog platform. The hosting and maintainability issues with Ghost became too much to handle. Astro's simpleness, use of serverless technology, and efficient CI/CD make it an ideal solution for my needs as a tech-savvy who values minimalism and simplicity. The use of serverless technology means I don't have to worry about server costs and maintenance, while CI/CD ensures my blog is always up-to-date and secure. Additionally, Astro's minimalistic approach means pages load quickly without any unnecessary bloat, making it the perfect fit for a minimalist like myself.
draft: false
category: Technology
---

# Why did I make the switch?

Soooo, I've been using Ghost as my blog platform for quite some time now, but recently I've made the switch to Astro. This decision wasn't made lightly, as I've been a loyal user of Ghost for a long while. However, I realized that the hosting and maintainability issues I faced with Ghost were becoming too much for me to handle. As someone who values minimalism and simplicity, I always strive to keep my online presence as straightforward as possible. And with Astro, I can write my own website and keep it stupidly simple (KISS). The clean and easy-to-use interface of Astro allows me to focus on what's important - the content. I believe that switching to Astro will not only solve my hosting and maintainability problems, but also enhance my overall blogging experience. That's why I decided to make the switch to Astro.

# What was so bad about Ghost?

Nothing was that bad, actually it was pretty smooth once you get used to it or once you use DigitalOcean servers or any managed server but I like to manage my own servers. The following were some of the spooky challenges that I faced while using Ghost:

- **Resource Intensive Requirements:** Ghost required a server in order to run, which added an extra layer of complexity to the platform. Setting up and maintaining a server was like trying to perform brain surgery with a toothpick. I mean, who has the time or resources for that?

- **Maintenance Hassles:** Maintaining a Ghost server was like trying to catch a greased pig - almost impossible. It required me to frequently SSH into the server to make updates, which was like trying to herd cats - chaotic. And if I didn't make the updates on time, the server could break down, leaving my blog with a case of the Monday morning blues.

- **Reluctance to Use DigitalOcean:** I wasn't comfortable with using DigitalOcean, which was one of the options for hosting a Ghost server. It was expensive and I _genuinely_ don't trust compaines with my date. This made me feel like I was always one step away from having my blog go offline, like a game of Jenga where one wrong move and it's all over.

# Servers can be expensive to run and maintain

The landscape of technology has changed dramatically in recent years, with the rise of serverless computing. Serverless technology allows developers to run code without the need for a dedicated server. Instead, the code runs on a cloud platform, like Cloudflare Workers, and the cloud provider handles the underlying infrastructure.

So, why did I switch to Astro? Well, one of the main reasons was the opportunity to take advantage of serverless technology. By using Cloudflare Workers, I no longer have to worry about the cost and maintenance of a server. This not only simplifies the blogging experience, but also allows me to focus on what really matters - creating great content for my readers.

Another benefit of serverless technology is scalability. With traditional servers, you need to predict the amount of traffic your website will receive and provision the appropriate amount of resources. This can lead to either over-provisioning, which is a waste of resources, or under-provisioning, which can result in a slow or unavailable website. With serverless technology, the cloud provider takes care of the underlying infrastructure, so you never have to worry about scalability again. Not that I did till now, but now - I _really_ don't.

# The Ideal Solution for a Tech-Savvy Blogger

As a tech-savvy blogger who values simplicity and speed, Astro is the ideal solution for my needs. Not only does it allow me to serve static pages, which is great for SEO, speed, and overall user experience, but it also gives me the flexibility to change any aspect of my website.

One of the things that sets Astro apart is its efficient use of CI/CD (Continuous Integration and Continuous Deployment). This powerful tool allows me to easily make changes to my blog and automatically deploy them to the CDN, without any manual intervention. This means that I can make changes to my blog in real-time, without having to wait for the changes to be pushed to production.

## Okay Burak, sum it up!

The integration of CI/CD with Astro also means that my blog is always up-to-date and secure. Any vulnerabilities or bugs are automatically detected and fixed, which gives me peace of mind knowing that my blog is always running smoothly.

Another great thing about Astro is that it's minimalistic. Astro doesn't ship a ton of JavaScript to the website. This means that my pages load quickly, without any unnecessary bloat. And because the platform is compiled so efficiently, I can easily serve my blog from a CDN.

Astro allows me to serve static pages which is a huge plus for SEO, speed, and all that jazz. And on top of that, I've got the flexibility to change any part of my website whenever I feel like shaking things up.

But the real game-changer here is the use of CI/CD. It's like having a personal assistant who makes sure my blog is always up-to-date and secure. No more manual intervention or late-night panic attacks about whether or not my blog is running smoothly.

And let's not forget about the minimalistic approach, my pages load lightning fast without any unnecessary baggage, which is just what this minimalist needs.

If you like my blog and want to use it somehow in your own projects or you just want to learn about the project structure, check out my [GitHub repo](https://github.com/burraksumer/burakMulayim)
