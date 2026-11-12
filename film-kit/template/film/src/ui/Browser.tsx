import React from 'react';
import {C, F, shadow} from '../lib/theme';
import {Icon} from './icons';

// Chromium 样子的浏览器外框（FAswitch 打开的独立浏览器）。坐标：外框左上角为原点
export const TAB_H = 46;
export const BAR_H = 52;
export const TOP = TAB_H + BAR_H; // 网页内容从这里开始

export type Tab = {title: string; icon?: React.ReactNode; loading?: boolean};

export const Browser: React.FC<{
  w: number;
  h: number;
  tabs: Tab[];
  active: number;
  url: string;
  urlTyped?: boolean; // 地址栏在编辑
  children: React.ReactNode;
  scrollY?: number;
  badge?: React.ReactNode;
  newTabHover?: number;
}> = ({w, h, tabs, active, url, children, scrollY = 0, badge, newTabHover = 0}) => {
  const tabW = Math.min(250, (w - 260) / Math.max(1, tabs.length));
  return (
    <div
      data-probe="skip"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        borderRadius: 14,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: shadow.window,
        border: '1px solid rgba(35,40,66,0.10)',
      }}
    >
      {/* 标签栏 */}
      <div style={{position: 'absolute', left: 0, top: 0, width: w, height: TAB_H, background: '#E8EAED'}}>
        <div style={{position: 'absolute', left: 12, top: 12, width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5F6368'}}>
          <Icon name="chevDown" size={16} sw={2.2} />
        </div>
        {tabs.map((tb, i) => {
          const on = i === active;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 44 + i * tabW,
                top: on ? 6 : 8,
                width: tabW - 4,
                height: on ? TAB_H - 6 : TAB_H - 14,
                background: on ? '#fff' : 'transparent',
                borderRadius: on ? '11px 11px 0 0' : 9,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '0 12px',
                boxSizing: 'border-box',
                fontFamily: F.ui,
                fontSize: 14.5,
                color: on ? '#202124' : '#5F6368',
              }}
            >
              <div style={{width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {tb.loading ? (
                  <div
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      border: '2px solid #C7CBD1',
                      borderTopColor: '#1A73E8',
                    }}
                  />
                ) : (
                  tb.icon
                )}
              </div>
              <div style={{flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{tb.title}</div>
              <Icon name="x" size={14} color="#5F6368" />
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: 44 + tabs.length * tabW + 6,
            top: 10,
            width: 28,
            height: 28,
            borderRadius: 8,
            background: newTabHover > 0 ? `rgba(0,0,0,${0.08 * newTabHover})` : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3C4043',
          }}
        >
          <Icon name="plus" size={18} sw={2} />
        </div>
        {/* 窗口按钮 */}
        <div style={{position: 'absolute', right: 0, top: 0, height: 36, display: 'flex', color: '#3C4043'}}>
          {['minus', 'square', 'x'].map((n) => (
            <div key={n} style={{width: 54, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Icon name={n} size={n === 'square' ? 13 : 16} sw={1.6} />
            </div>
          ))}
        </div>
      </div>
      {/* 工具栏 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: TAB_H,
          width: w,
          height: BAR_H,
          background: '#fff',
          borderBottom: '1px solid #E3E5E8',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 12px',
          boxSizing: 'border-box',
          color: '#5F6368',
        }}
      >
        <Icon name="arrowLeft" size={19} />
        <div style={{width: 14}} />
        <Icon name="arrowRight" size={19} color="#BDC1C6" />
        <div style={{width: 14}} />
        <Icon name="rotate" size={18} />
        <div
          style={{
            flex: 1,
            marginLeft: 14,
            height: 36,
            borderRadius: 18,
            background: '#F1F3F4',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            fontFamily: F.ui,
            fontSize: 15.5,
            color: '#202124',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name={url.startsWith('file') ? 'file' : 'lock'} size={15} color="#5F6368" />
          <span>{url}</span>
        </div>
        <div style={{width: 14}} />
        <Icon name="star" size={18} />
        <div style={{width: 12}} />
        {badge}
        <div style={{width: 10}} />
        <Icon name="moreV" size={18} />
      </div>
      {/* 网页 */}
      <div style={{position: 'absolute', left: 0, top: TOP, width: w, height: h - TOP, overflow: 'hidden', background: '#fff'}}>
        <div style={{position: 'absolute', left: 0, top: -scrollY, width: w}}>{children}</div>
      </div>
    </div>
  );
};

/** 浏览器右上角的档案标记：表明这是 FAswitch 档案的独立浏览器（示意） */
export const ProfileBadge: React.FC<{name: string}> = ({name}) => (
  <div
    style={{
      height: 28,
      borderRadius: 14,
      background: C.faGreenSoft,
      color: C.faGreen,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 12px 0 8px',
      fontFamily: F.zh,
      fontWeight: 600,
      fontSize: 13.5,
      whiteSpace: 'nowrap',
    }}
  >
    <div style={{width: 8, height: 8, borderRadius: 8, background: C.faGreen}} />
    {name}
  </div>
);
