import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export const TitleCard: React.FC<{title: string}> = ({title}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  const scale = interpolate(frame, [0, 20], [0.8, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: '#111', justifyContent: 'center', alignItems: 'center'}}>
      <h1 style={{color: 'white', fontSize: 120, fontFamily: 'sans-serif', opacity, transform: `scale(${scale})`}}>
        {title}
      </h1>
    </AbsoluteFill>
  );
};
