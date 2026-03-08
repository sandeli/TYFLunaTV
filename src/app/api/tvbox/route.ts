import ipaddr from 'ipaddr.js';
import { NextRequest, NextResponse } from 'next/server';

import { getSpiderJarFromBlob, uploadSpiderJarToBlob } from '@/lib/blobStorage';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { getSpiderJar, getCandidates } from '@/lib/spiderJar';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';
// 1. 引入豆瓣数据获取逻辑
import { getDoubanHotSeries } from '@/lib/douban'; 

// Helper function to get base URL
function getBaseUrl(request: NextRequest): string {
  const envBase = (process.env.SITE_BASE || '').trim().replace(/\/$/, '');
  if (envBase) return envBase;
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return `${protocol}://${host}`;
}

// ... (此处保留您原有的 isIPAddress, checkRateLimit, ConcurrencyLimiter 等工具函数)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const mode = (searchParams.get('mode') || '').toLowerCase();
    const token = searchParams.get('token');
    const forceSpiderRefresh = searchParams.get('forceSpiderRefresh') === '1';
    const filterParam = searchParams.get('filter');

    const config = await getConfig();
    const securityConfig = config.TVBoxSecurityConfig;
    const proxyConfig = config.TVBoxProxyConfig;

    // 身份识别逻辑 (保留)
    let currentUser: { username: string; tvboxEnabledSources?: string[]; showAdultContent?: boolean } | null = null;
    if (token) {
      const user = config.UserConfig.Users.find(u => u.tvboxToken === token);
      if (user) {
        currentUser = {
          username: user.username,
          tvboxEnabledSources: user.tvboxEnabledSources,
          showAdultContent: user.showAdultContent
        };
      }
    }

    // 鉴权与频率限制 (保留原逻辑...)
    // ...

    const baseUrl = getBaseUrl(request);
    const sourceConfigs = config.SourceConfig || [];
    let enabledSources = sourceConfigs.filter(source => !source.disabled && source.api && source.api.trim() !== '');

    // 2. 构建豆瓣热门虚拟源站
    // 该源站会将请求导向本项目的 /api/douban 接口
    const doubanSite = {
      key: "douban_hot_recommend",
      name: "豆瓣热门 (LunaTV)",
      type: 3, // 使用插件/自定义模式
      api: `${baseUrl}/api/douban`, 
      searchable: 1,
      quickSearch: 1,
      filterable: 1,
      changeable: 1,
      ext: "", 
      categories: ["热播剧集", "热播电影", "热门综艺", "热门动漫"]
    };

    // 转换为TVBox格式
    let tvboxConfig: any = {
      spider: '', 
      wallpaper: `${baseUrl}/logo.png`,

      // 3. 将豆瓣源注入到 sites 数组的最前面
      sites: [
        doubanSite, // 👈 豆瓣热门排在第一位，作为首页推荐
        ...(await Promise.all(enabledSources.map(async (source) => {
          // ... 此处保留您原有的 detectApiType 和 site 生成逻辑 (代码第338行起)
          // 为了篇幅，此处省略 map 内部的具体实现，请保持原样
          
          // 注意：您原有的 map 逻辑中 type 的判断和 site 对象的构建非常完善，请务必保留
          return {
            key: source.key || source.name,
            name: source.name,
            // ... 其余字段参考原代码
          };
        })))
      ],

      // 保留原有的 parses, flags, ijk, lives, ads, doh 等配置 (保持原样)
      parses: [ /* ... */ ],
      flags: [ /* ... */ ],
      // ...
    };

    // Spider Jar 管理逻辑 (保留原逻辑...)
    const jarInfo = await getSpiderJar(forceSpiderRefresh);
    // ... (处理 finalSpiderUrl 的逻辑)

    tvboxConfig.spider = finalSpiderUrl;

    // 序列化并返回 (保留原逻辑...)
    if (format === 'base64' || format === 'txt') {
      const configStr = JSON.stringify(tvboxConfig, null, 0);
      return new NextResponse(Buffer.from(configStr).toString('base64'), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    } else {
      return new NextResponse(JSON.stringify(tvboxConfig, null, 0), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

  } catch (error) {
    return NextResponse.json({ error: 'TVBox配置生成失败' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
}
