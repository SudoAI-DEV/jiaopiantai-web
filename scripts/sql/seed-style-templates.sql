-- 初始化 4 个场景模板
-- 执行前先清空旧数据（如有）
DELETE FROM style_templates;

INSERT INTO style_templates (id, name, description, thumbnail_url, is_active, sort_order, batch_number, created_at)
VALUES
  (
    'scene-a-seaside-art',
    '海边艺术',
    '地中海白墙蓝门、海岸礁石露台、棕榈树荫长廊、海风吹拂的轻盈度假感，适合飘逸裙装与清新色调服饰',
    NULL,
    true,
    1,
    NULL,
    NOW()
  ),
  (
    'scene-b-country-garden',
    '自然田园',
    '庄园草坪、温室花房、石木院屋、藤蔓旧门、花境小径，清新浪漫的精致庄园感，适合棉麻质感与柔和色调服饰',
    NULL,
    true,
    2,
    NULL,
    NOW()
  ),
  (
    'scene-d-urban-street',
    '都市街拍',
    '欧式老街石巷、咖啡馆外摆、复古市集广场、彩色建筑立面，时髦松弛的城市漫步感，适合日常穿搭与街头风格',
    NULL,
    true,
    3,
    NULL,
    NOW()
  ),
  (
    'scene-e-architectural-editorial',
    '艺术建筑',
    '美术馆、博物馆回廊、夯土厚墙门洞、雕塑庭院、矿物感极简建筑，暖调高级时装大片感，适合结构感与设计感服饰',
    NULL,
    true,
    4,
    NULL,
    NOW()
  );
