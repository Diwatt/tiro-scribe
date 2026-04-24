const { withGradleProperties } = require('@expo/config-plugins');

const withGradleLimits = (config) => {
    return withGradleProperties(config, (modConfig) => {
        modConfig.modResults.push(
            // Limite le nombre de compilateurs C++ en parallèle
            { type: 'property', key: 'org.gradle.workers.max', value: '2' },
            // Coupe le daemon plus vite pour libérer la RAM
            { type: 'property', key: 'org.gradle.daemon.idletimeout', value: '10000' }
        );
        return modConfig;
    });
};

module.exports = withGradleLimits;
