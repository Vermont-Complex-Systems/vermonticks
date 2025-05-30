# Vermont ticks

**Vermont ticks** is an interactive web application for visualizing and analyzing pathogen risk associated with outdoor activities and disease vectors in Vermont.

## Overview

This application helps users understand the relationship between outdoor recreational activities, disease-carrying vectors (like ticks and mosquitoes), and pathogen risk across different regions of Vermont. By combining geographic data with epidemiological modeling, the MAP2LE group provides insights into where and when people might be at higher risk for vector-borne diseases.

## Features

### Interactive Risk Visualization
- **Geographic Mapping**: Displays Vermont topography, trails, and Lake Champlain
- **Activity Layers**: Toggle between different outdoor activities (currently hiking, with more planned)
- **Vector Selection**: Choose from multiple disease vectors including blacklegged ticks and mosquitoes
- **Pathogen Analysis**: Focus on specific pathogens like Lyme disease (B. burgdorferi), Anaplasmosis, and Babesiosis

### Predictive Modeling
- **Autoregressive Models**: Forecast risk based on various environmental and temporal indices
- **Risk Assessment**: Combine activity patterns with vector presence to estimate exposure risk
- **Temporal Analysis**: Understand how risk varies over time and seasons

### Data Integration
- **Trail Networks**: Vermont emergency trails data from VCGI OpenData
- **Topographic Data**: Detailed Vermont state boundaries and geographic features
- **Water Bodies**: Lake Champlain mapping for comprehensive geographic context
- **Municipal Data**: Focus on key Vermont cities and towns

## Key Locations

The application currently highlights major Vermont municipalities:
- Burlington
- Montpelier  
- Rutland
- Barre
- Newport
- Swanton
- Vergennes
- Albany

## Technology Stack

- **Observable Framework**: Interactive data visualization platform
- **D3.js**: Geographic projections and data visualization
- **Plot**: Statistical graphics and mapping
- **TopoJSON**: Efficient geographic data encoding
- **GeoJSON**: Trail and geographic feature data

## Data Sources

- **Vermont Center for Geographic Information (VCGI)**: Trail networks and emergency access routes
- **Topographic Data**: Vermont state boundaries and terrain
- **Lake Champlain Data**: Water body boundaries and features
- **Epidemiological Data**: Pathogen and vector distribution patterns (in development)

## Current Status

⚠️ **Work in Progress** — This application is currently under active development. Some features may be incomplete or subject to change as we refine the models and expand the dataset.

---

*MAP2LE is designed to help outdoor enthusiasts make informed decisions about recreation activities while understanding potential health risks. Always consult with healthcare professionals for medical advice regarding vector-borne diseases.*