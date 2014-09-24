---
layout: page
title: Change The World
tagline: 
---

<ul >
    {% for post in site.posts limit 10 %}
    <li><span>{{ post.date | date_to_string }}</span> &raquo; <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a></li>
        {{ post.content | strip_html | truncatewords:50}}<br>
            <a href="{{ post.url }}">Read more...</a><br><br>
    {% endfor %}
</ul>

