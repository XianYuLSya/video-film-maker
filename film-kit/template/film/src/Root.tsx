import React from 'react';
import {AbsoluteFill, Composition} from 'remotion';
import './lib/fonts';
import {Film, FilmProps, allSfx} from './Film';
import {FPS, H, TOTAL, W} from './lib/time';
import type {Ev} from './kit/sfx';
import {SHORT_FRAMES, ShortFilm, shortSfx} from './short/Short';
import {GALLERY_SECONDS, Gallery} from './blocks/Gallery';
import * as GalleryMod from './blocks/Gallery';
import {BRAND_GALLERY_SECONDS, BrandGallery} from './brand/BrandGallery';
import {CINE_GALLERY_SECONDS, CineGallery} from './cine/CineGallery';

// 只用来导出音效清单（vo/sfx.py 按清单混音，不用逐帧渲染声音）
const SfxList: React.FC<{key?: string; events: Ev[]}> = () => <AbsoluteFill />;

// 积木陈列片：横屏 Gallery 是积木库负责人的；竖屏 GalleryV 可能还没写好，
// 所以用 import * 拿整个模块、判断有没有再登记 —— 缺了不会让整个工程编译失败。
const G: any = GalleryMod;
const GALLERY_V_SECONDS: number = typeof G.GALLERY_V_SECONDS === 'number' ? G.GALLERY_V_SECONDS : GALLERY_SECONDS;
const GalleryV: React.FC | null = typeof G.GalleryV === 'function' ? G.GalleryV : null;

export const Root: React.FC = () => (
  <>
    <Composition id="FilmZh" component={Film} durationInFrames={Math.ceil(TOTAL() * FPS)} fps={FPS} width={W} height={H} defaultProps={{lang: 'zh', audio: 'none', probe: false} as FilmProps} />
    {/* 竖屏短版：B 站竖屏、YouTube Shorts、X。没有通用片头片尾 */}
    <Composition id="ShortZh" component={ShortFilm} durationInFrames={SHORT_FRAMES(FPS)} fps={FPS} width={1080} height={1920} defaultProps={{probe: false}} />
    <Composition
      id="SfxList"
      component={SfxList}
      durationInFrames={1}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{key: 'zh', events: [] as Ev[]}}
      calculateMetadata={({props}) => ({props: {...props, events: allSfx()}})}
    />
    <Composition
      id="SfxListShort"
      component={SfxList}
      durationInFrames={1}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{key: 'short', events: [] as Ev[]}}
      calculateMetadata={({props}) => ({props: {...props, events: shortSfx()}})}
    />
    <Composition id="Gallery" component={Gallery} durationInFrames={Math.ceil(GALLERY_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    {/* 品牌片风格包陈列片（brand\） */}
    <Composition id="BrandGallery" component={BrandGallery} durationInFrames={Math.ceil(BRAND_GALLERY_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    {/* 电影感产品片镜头包陈列片（cine\） */}
    <Composition id="CineGallery" component={CineGallery} durationInFrames={Math.ceil(CINE_GALLERY_SECONDS * FPS)} fps={FPS} width={W} height={H} />
    {GalleryV && (
      <Composition id="GalleryV" component={GalleryV} durationInFrames={Math.ceil(GALLERY_V_SECONDS * FPS)} fps={FPS} width={1080} height={1920} />
    )}
  </>
);
