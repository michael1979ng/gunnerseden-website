<?php
// Gunners Den — Social Share Preview Page
// Place this file in the same folder as index.html on your web server.
// Social media crawlers hit this URL, read the OG tags, then the JS redirects real users to the article.

$BIN_ID  = '6a2eb678da38895dfebee716';
$API_KEY = '$2a$10$Uh9yEH0a9qXYx3NGzQx6Ve8tzuiKRxNdWfoOJyE9aeKwxKMenvp6u';

$DEFAULT_IMAGE = 'https://gunnersden.net/og-image.png';
$DEFAULT_TITLE = 'Gunners Den – Arsenal FC Fan Site';
$DEFAULT_DESC  = 'Independent Arsenal FC fan site. Premier League champions coverage, UCL analysis, transfer news and live match blogs.';
$SITE_URL      = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
               . '://' . $_SERVER['HTTP_HOST']
               . rtrim(dirname($_SERVER['REQUEST_URI']), '/');

$id = isset($_GET['id']) ? trim($_GET['id']) : '';

$title = $DEFAULT_TITLE;
$desc  = $DEFAULT_DESC;
$image = $DEFAULT_IMAGE;
$artId = '';

if ($id !== '') {
    $artId = $id;
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 5,
            'header'  => "X-Master-Key: $API_KEY\r\nX-Bin-Meta: false\r\n"
        ]
    ]);
    $json = @file_get_contents("https://api.jsonbin.io/v3/b/{$BIN_ID}/latest", false, $ctx);
    if ($json) {
        $data     = json_decode($json, true);
        $record   = isset($data['record']) ? $data['record'] : $data;
        $articles = array_merge(
            isset($record['articles'])    ? $record['articles']    : [],
            isset($record['fanArticles']) ? $record['fanArticles'] : []
        );
        foreach ($articles as $art) {
            if (isset($art['id']) && (string)$art['id'] === (string)$id) {
                $title = htmlspecialchars(($art['title'] ?? '') . ' | Gunners Den', ENT_QUOTES);
                $raw   = strip_tags($art['excerpt'] ?? substr(strip_tags($art['body'] ?? ''), 0, 200));
                $desc  = htmlspecialchars($raw, ENT_QUOTES);
                // Pick best image: cover field → first <img> in body → site logo
                $artImage = $DEFAULT_IMAGE;
                if (!empty($art['image'])) {
                    $artImage = $art['image'];
                } elseif (!empty($art['body'])) {
                    preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $art['body'], $imgMatch);
                    if (!empty($imgMatch[1])) $artImage = $imgMatch[1];
                }
                $image = htmlspecialchars($artImage, ENT_QUOTES);
                break;
            }
        }
    }
}

$pageUrl    = htmlspecialchars("$SITE_URL/share.php?id=$artId", ENT_QUOTES);
$redirectTo = "$SITE_URL/index.html" . ($artId !== '' ? "#art-$artId" : '');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title><?= $title ?></title>

<!-- Open Graph (Facebook, WhatsApp, Telegram, iMessage) -->
<meta property="og:type"        content="article">
<meta property="og:site_name"   content="Gunners Den">
<meta property="og:url"         content="<?= $pageUrl ?>">
<meta property="og:title"       content="<?= $title ?>">
<meta property="og:description" content="<?= $desc ?>">
<meta property="og:image"       content="<?= $image ?>">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">

<!-- Twitter / X -->
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="<?= $title ?>">
<meta name="twitter:description" content="<?= $desc ?>">
<meta name="twitter:image"       content="<?= $image ?>">

<!-- Redirect real visitors instantly -->
<meta http-equiv="refresh" content="0;url=<?= htmlspecialchars($redirectTo, ENT_QUOTES) ?>">
</head>
<body>
<script>window.location.replace(<?= json_encode($redirectTo) ?>);</script>
<p>Loading article… <a href="<?= htmlspecialchars($redirectTo, ENT_QUOTES) ?>">Click here if not redirected.</a></p>
</body>
</html>
