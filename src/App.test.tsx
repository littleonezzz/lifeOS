import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { App } from './App';

describe('App 运行时冒烟', () => {
  it('SSR 渲染整个应用不崩溃，且包含今日/底部导航', () => {
    const html = renderToString(createElement(App));
    expect(html).toContain('今日');
    expect(html).toContain('计划');
    expect(html).toContain('开始中断');
  });
});
