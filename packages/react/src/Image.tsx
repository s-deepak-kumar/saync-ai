'use client';

import React, { useEffect, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type ImageContract,
  type AvatarContract,
  type ImageExpectation,
  type AvatarExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

export interface SayncImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name?: string;
  /** Required by HTML semantics + the contract — avoids decorative-only images
   *  passing alt="" silently. The contract can still allow that explicitly. */
  src: string;
  alt: string;
  expects?: ImageContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Image> — wraps <img>. Registers a contract that asserts
 * the image actually loads (`complete && naturalWidth > 0`) and has
 * meaningful alt text. Useful for catching broken CDN paths and
 * accessibility regressions in CI.
 */
export const SayncImage = React.forwardRef<HTMLImageElement, SayncImageProps>(
  ({ name, src, alt, expects, sourceFile, sourceLine, ...imgProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('image'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Image');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: ImageExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'image',
        src,
        selector: `img[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, src, sourceFile, sourceLine]);

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="image"
        {...imgProps}
      />
    );
  },
);
SayncImage.displayName = 'SayncImage';

/* ──────────────────────────────────────────────────────────── */

export interface SayncAvatarProps {
  name?: string;
  /** Image URL. If absent or fails to load, the `fallback` renders. */
  src?: string;
  alt: string;
  /** Rendered when src is absent or fails. Typically initials or an icon. */
  fallback: React.ReactNode;
  size?: number;
  expects?: AvatarContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Avatar> — image with graceful fallback. Renders <img> when
 * `src` is provided AND loads; otherwise renders the `fallback`
 * content. The contract asserts that exactly one of those is visible
 * (you never end up with a broken-image icon).
 */
export function SayncAvatar({
  name,
  src,
  alt,
  fallback,
  size = 40,
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
}: SayncAvatarProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('avatar'));
  const [imageFailed, setImageFailed] = useState(false);

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Avatar');
  const contractKey = JSON.stringify(expects ?? null);
  const hasImage = !!src && !imageFailed;

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: AvatarExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'avatar',
      hasImage,
      selector: `[data-saync-id="${expectationId}"]`,
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
  }, [ctx, expectationId, resolvedName, contractKey, hasImage, sourceFile, sourceLine]);

  const shellStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    background: '#F1F5F9',
    ...style,
  };

  return (
    <span
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type="avatar"
      data-saync-has-image={hasImage ? 'true' : 'false'}
      aria-label={alt}
      role="img"
      className={className}
      style={shellStyle}
    >
      {hasImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImageFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          data-saync-avatar-img={expectationId}
        />
      ) : (
        <span data-saync-avatar-fallback={expectationId}>{fallback}</span>
      )}
    </span>
  );
}
SayncAvatar.displayName = 'SayncAvatar';
