# Homepage support team image

Created with the built-in imagegen tool for DeskZeal's homepage hero. The people
are illustrative, not actual staff, customers or endorsers. No competitor
artwork was used.

## Files

- `web/public/images/support-team-1280.webp`: 1280 × 960, desktop and high-density screens.
- `web/public/images/support-team-640.webp`: 640 × 480, smaller screens.
- `web/public/images/support-team.jpg`: 1280 × 960 JPEG fallback.
- `design/marketing/support-team-original.png`: local full-resolution original;
  the design directory is ignored, so deployments use the public image files.

The `picture` element selects an appropriate WebP using `srcset` and `sizes`.
The image loads eagerly with high priority and reserves its 4:3 aspect ratio.
Decorative shapes and icons use the application's existing color tokens, with
gentle ring and floating motion. A pulsing dot precedes the hero's helpdesk
label. Visitors can pause/resume the hero animation; reduced-motion preferences
disable it automatically.

## Generation prompt

Use case: photorealistic-natural. Asset type: a customer support SaaS homepage
hero photo for DeskZeal, next to a large headline in a two-column layout. Create
an original professional editorial photograph of a friendly South Asian woman
customer support representative in her early thirties wearing a slim discreet
microphone headset and a navy blue shirt, sitting at a bright modern desk with
a laptop; a male teammate in soft focus a little behind her, collaborating
attentively. Calm approachable expression and relaxed natural posture, not a
stock-photo exaggerated grin. Light contemporary office with pale cool blue
walls, soft natural window light, navy #213145 clothing and restrained warm
burnt orange #A33900 accents on a notebook or chair. Authentic skin texture,
editorial commercial photography, clean sophisticated composition, subtle
depth of field. Landscape 4:3 composition, subjects centered safely so it
still crops nicely at smaller mobile widths, faces and headset fully inside
the frame, laptop back visible in the lower foreground with no identifiable
brand. Keep top and bottom corners uncluttered for small HTML decorative
overlays. No application screenshot, no visible software UI, no floating UI
elements, no words or logos, no watermark, no graphs, no ratings or testimonial
elements. This should communicate helpful people and customer care, not a
call-center crowd.
