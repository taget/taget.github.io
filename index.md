---
layout: page
title: Change The World
tagline: 
---

<ul class="post-grid">
    {% for post in site.posts limit: 10 %}
    <li class="post-item reveal">
        <span class="tech-date">{{ post.date | date_to_string }}</span>
        <h3><a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a></h3>
        <p class="post-excerpt">{{ post.content | strip_html | truncatewords: 50 }}</p>
        <a class="read-more" href="{{ BASE_PATH }}{{ post.url }}">Read more</a>
    </li>
    {% endfor %}
</ul>
