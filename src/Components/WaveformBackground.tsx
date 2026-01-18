import React, { useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface WaveformBackgroundProps {
  style?: ViewStyle;
  color?: string; // Couleur de base (ex: #C5B4A0)
}

export function WaveformBackground({
  style,
  color = '#C5B4A0',
}: WaveformBackgroundProps): React.JSX.Element {
  
  // Dimensions virtuelles du canvas SVG
  const width = 300;
  const height = 56;
  const centerY = height / 2; // L'axe central de symétrie

  // Fonction pour générer un chemin de vague pleine et symétrique
  const generateSymmetricWavePath = (
    phaseOffset: number,
    frequencyMult: number, 
    amplitudeMult: number
  ) => {
    // Tableaux pour stocker les points supérieurs et inférieurs
    const topPoints: string[] = [];
    const bottomPoints: string[] = [];

    // On parcourt la largeur
    for (let x = 0; x <= width; x += 5) {
      // 1. Enveloppe (Cloche) : Pour que ça soit calme aux bords et fort au centre
      const normalizedX = (x / width) * 2 - 1; 
      const envelope = Math.pow(1 - Math.pow(Math.abs(normalizedX), 2), 1.5);

      // 2. Signal : Mélange de sinus pour une ondulation naturelle
      const sine1 = Math.sin((x * 0.03 * frequencyMult) + phaseOffset);
      const sine2 = Math.cos((x * 0.07 * frequencyMult) + phaseOffset * 1.3);
      const combinedSignal = (sine1 + sine2 * 0.6) / 1.6;

      // 3. Calcul de l'écart par rapport au centre (Delta Y)
      const maxAmplitude = 24 * amplitudeMult; // Amplitude max (un peu moins de la moitié de la hauteur)
      // L'écart est toujours positif, c'est la "largeur" de la vague à ce point
      const deltaY = Math.abs(combinedSignal * envelope * maxAmplitude);

      // On ajoute les points pour le haut et le bas
      topPoints.push(`L ${x} ${centerY - deltaY}`);
      // Pour le bas, on insère au début pour construire le chemin en sens inverse plus tard
      bottomPoints.unshift(`L ${x} ${centerY + deltaY}`);
    }

    // Construction du chemin final :
    // 1. Aller au début (centre-gauche)
    // 2. Tracer toute la ligne du haut (de gauche à droite)
    // 3. Tracer toute la ligne du bas (de droite à gauche)
    // 4. Fermer le chemin
    return `M 0 ${centerY} ${topPoints.join(' ')} ${bottomPoints.join(' ')} Z`;
  };

  // On génère 3 couches avec des paramètres variés
  const paths = useMemo(() => {
    return [
      generateSymmetricWavePath(0, 1.0, 1.0),    // Vague principale
      generateSymmetricWavePath(2, 1.2, 0.85),   // Vague secondaire
      generateSymmetricWavePath(4, 1.5, 0.7),    // Vague de fond
    ];
  }, []);

  // RGB de base pour la couleur "Sable" (#C5B4A0)
  const rgbBase = "197, 180, 160"; 

  return (
    <Svg
      height="100%"
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={[styles.svg, style]}
    >
      {paths.map((d, index) => (
        <Path
          key={index}
          d={d}
          stroke="none"
          // Opacité progressive pour l'effet de profondeur
          fill={`rgba(${rgbBase}, ${0.3 + index * 0.1})`}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
});