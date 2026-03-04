const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding materialbibliotek och projektmallar...');

  // ============================================
  // MATERIALBIBLIOTEK
  // ============================================

  const materials = [
    // === KAKEL & KLINKER ===
    {
      name: 'Kakel Hornbach Premium Grå 60x60',
      category: 'KAKEL_KLINKER',
      keywords: ['kakel', 'hornbach', 'grå', '60x60', 'premium', 'vägg'],
      unit: 'kvm',
      currentPrice: 450,
      supplier: 'Hornbach',
      typicalUsagePerSqm: 1.15, // 15% spill
      typicalUsageNote: 'Inkluderar 15% spill för skärning och hörn'
    },
    {
      name: 'Kakel Vit Matt 30x60',
      category: 'KAKEL_KLINKER',
      keywords: ['kakel', 'vit', 'matt', '30x60', 'badrum'],
      unit: 'kvm',
      currentPrice: 320,
      supplier: 'Byggmax',
      typicalUsagePerSqm: 1.15
    },
    {
      name: 'Klinker Grå 30x30 Golv',
      category: 'KAKEL_KLINKER',
      keywords: ['klinker', 'golv', 'grå', '30x30', 'halkfri'],
      unit: 'kvm',
      currentPrice: 380,
      supplier: 'Hornbach',
      typicalUsagePerSqm: 1.12
    },
    {
      name: 'Kakel Mosaik 30x30',
      category: 'KAKEL_KLINKER',
      keywords: ['mosaik', 'kakel', 'dekor', '30x30'],
      unit: 'kvm',
      currentPrice: 580,
      supplier: 'K-Rauta',
      typicalUsagePerSqm: 1.1
    },

    // === VVS PORSLIN ===
    {
      name: 'WC-stol Gustavsberg Nordic 3510',
      category: 'VVS_PORSLIN',
      keywords: ['wc', 'toalett', 'gustavsberg', 'nordic', 'vägghängd'],
      unit: 'st',
      currentPrice: 3200,
      supplier: 'Certego',
      supplierArticleNumber: 'GB1135106101',
      typicalUsageNote: '1 st per badrum'
    },
    {
      name: 'Handfat Gustavsberg Nautic 5565',
      category: 'VVS_PORSLIN',
      keywords: ['handfat', 'tvättställ', 'gustavsberg', 'nautic'],
      unit: 'st',
      currentPrice: 1850,
      supplier: 'Certego',
      typicalUsageNote: '1 st per badrum'
    },
    {
      name: 'Duschset Oras Safira 1142',
      category: 'VVS_PORSLIN',
      keywords: ['dusch', 'blandare', 'oras', 'safira', 'termostat'],
      unit: 'st',
      currentPrice: 2800,
      supplier: 'K-Rauta',
      typicalUsageNote: '1 st per badrum'
    },
    {
      name: 'Handfatsblandare Tapwell TVM071',
      category: 'VVS_PORSLIN',
      keywords: ['blandare', 'kran', 'tapwell', 'handfat'],
      unit: 'st',
      currentPrice: 1200,
      supplier: 'Byggmax'
    },
    {
      name: 'Golvbrunn Purus 7697010',
      category: 'VVS_PORSLIN',
      keywords: ['golvbrunn', 'avlopp', 'purus', 'badrum'],
      unit: 'st',
      currentPrice: 850,
      supplier: 'Certego',
      typicalUsageNote: '1 st per våtrum'
    },

    // === VVS DELAR ===
    {
      name: 'VVS-paket Badrum Komplett',
      category: 'VVS_DELAR',
      keywords: ['vvs', 'rör', 'kopplingar', 'paket', 'badrum'],
      unit: 'paket',
      currentPrice: 15000,
      supplier: 'Certego',
      typicalUsageNote: 'Komplett paket för standardbadrum 6-10 kvm'
    },
    {
      name: 'Tätskikt 2-komponent 20 kg',
      category: 'VVS_DELAR',
      keywords: ['tätskikt', 'våtrum', 'membran', 'vattentätt'],
      unit: 'st',
      currentPrice: 1200,
      supplier: 'Byggmax',
      typicalUsagePerSqm: 0.12, // 1 hink täcker ~8-10 kvm
      typicalUsageNote: '1 hink täcker 8-10 kvm med 2 lager'
    },

    // === GOLVVÄRME ===
    {
      name: 'Golvvärmesystem Raychem T2 Red 10 kvm',
      category: 'GOLVVARME',
      keywords: ['golvvärme', 'raychem', 't2', 'elektrisk', '10kvm'],
      unit: 'kvm',
      currentPrice: 1200,
      supplier: 'Elsäkerhetsverket',
      typicalUsagePerSqm: 1.0,
      typicalUsageNote: 'Täcker upp till 10 kvm'
    },
    {
      name: 'Golvvärmematta 160W/kvm',
      category: 'GOLVVARME',
      keywords: ['golvvärme', 'matta', 'elektrisk', '160w'],
      unit: 'kvm',
      currentPrice: 980,
      supplier: 'K-Rauta',
      typicalUsagePerSqm: 1.0
    },

    // === EL-MATERIAL ===
    {
      name: 'El-paket Badrum',
      category: 'EL_MATERIAL',
      keywords: ['el', 'kabel', 'uttag', 'strömbrytare', 'badrum'],
      unit: 'paket',
      currentPrice: 8000,
      supplier: 'Ahlsell',
      typicalUsageNote: 'Komplett elpaket för badrum med golvvärme'
    },
    {
      name: 'LED-spotlight GU10 IP44 (3-pack)',
      category: 'EL_ARMATURER',
      keywords: ['led', 'spotlight', 'gu10', 'ip44', 'våtrum'],
      unit: 'paket',
      currentPrice: 450,
      supplier: 'Byggmax'
    },

    // === BYGG-MATERIAL ===
    {
      name: 'Gipsplatta 13mm 120x240',
      category: 'BYGG_MATERIAL',
      keywords: ['gips', 'vägg', '13mm', 'gipsplatta'],
      unit: 'st',
      currentPrice: 85,
      supplier: 'Byggmax'
    },
    {
      name: 'Spackel Fukt 20L',
      category: 'BYGG_MATERIAL',
      keywords: ['spackel', 'fukt', 'våtrum', 'finish'],
      unit: 'st',
      currentPrice: 380,
      supplier: 'Byggmax'
    },

    // === FÄRG & FINISH ===
    {
      name: 'Målningsfärg Beckers Vit 10L',
      category: 'FARG_FINISH',
      keywords: ['färg', 'beckers', 'vit', '10l', 'vägg'],
      unit: 'st',
      currentPrice: 650,
      supplier: 'Färghem',
      typicalUsageNote: '1 hink täcker ~50-60 kvm med 2 lager'
    },
    {
      name: 'Grundfärg 10L',
      category: 'FARG_FINISH',
      keywords: ['grund', 'färg', 'primer', '10l'],
      unit: 'st',
      currentPrice: 480,
      supplier: 'Färghem'
    },
    {
      name: 'Fasadfärg Alcro 10L',
      category: 'FARG_FINISH',
      keywords: ['fasad', 'utvändig', 'alcro', '10l'],
      unit: 'st',
      currentPrice: 850,
      supplier: 'Färghem',
      typicalUsageNote: 'Täcker ~40-50 kvm fasad'
    },

    // === KÖK ===
    {
      name: 'Köksluckor IKEA Sävedal Vit (per lucka)',
      category: 'KOK_LUCKOR',
      keywords: ['kökslucka', 'ikea', 'sävedal', 'vit'],
      unit: 'st',
      currentPrice: 450,
      supplier: 'IKEA'
    },
    {
      name: 'Bänkskiva Laminat Ek 3m',
      category: 'KOK_BENKSKIVA',
      keywords: ['bänkskiva', 'laminat', 'ek', '3m', 'kök'],
      unit: 'st',
      currentPrice: 2800,
      supplier: 'Hornbach'
    },
    {
      name: 'Bänkskiva Kompakt Grå 3m',
      category: 'KOK_BENKSKIVA',
      keywords: ['bänkskiva', 'kompakt', 'grå', '3m', 'kök'],
      unit: 'st',
      currentPrice: 3200,
      supplier: 'Byggmax'
    },

    // === SNICKERI (för garderober) ===
    {
      name: 'Garderob PAX IKEA 180x250',
      category: 'OVRIGT',
      keywords: ['garderob', 'pax', 'ikea', '180x250', 'skjutdörrar'],
      unit: 'st',
      currentPrice: 6500,
      supplier: 'IKEA',
      typicalUsageNote: 'Grundstomme 180cm bred, 250cm hög'
    },
    {
      name: 'Spegelskjutdörrar 180x250',
      category: 'OVRIGT',
      keywords: ['spegel', 'skjutdörr', 'garderob', '180x250'],
      unit: 'st',
      currentPrice: 2400,
      supplier: 'IKEA'
    },
    {
      name: 'Lådor för garderob 605x430x185',
      category: 'OVRIGT',
      keywords: ['lådor', 'förvaring', 'garderob', '605x430'],
      unit: 'st',
      currentPrice: 350,
      supplier: 'IKEA'
    },

    // === TAPETSERING ===
    {
      name: 'Tapet Premium (rulle)',
      category: 'OVRIGT',
      keywords: ['tapet', 'vägg', 'rulle', 'premium'],
      unit: 'rulle',
      currentPrice: 450,
      supplier: 'Byggmax',
      typicalUsageNote: '1 rulle täcker ~5 kvm'
    },
    {
      name: 'Tapetlim 5L',
      category: 'OVRIGT',
      keywords: ['lim', 'tapetlim', '5l'],
      unit: 'st',
      currentPrice: 180,
      supplier: 'Byggmax'
    }
  ];

  console.log(`📦 Skapar ${materials.length} material i biblioteket...`);

  for (const material of materials) {
    await prisma.material.create({
      data: material
    });
  }

  console.log('✅ Material skapade!');

  // ============================================
  // PROJEKTMALLAR
  // ============================================

  const templates = [
    {
      name: 'Standard Badrum 8 kvm',
      description: 'Helrenovering av standardbadrum 8 kvm med kakel, klinker och nya VVS-porslin',
      keywords: ['badrum', '8kvm', 'helrenovering', 'kakel', 'standard'],
      mainCategory: 'VATRUM',
      subCategory: 'BADRUM',
      projectType: 'Helrenovering badrum',
      defaultComplexity: 'MEDIUM',
      defaultAreaSqm: 8.0,
      workTemplate: [
        { category: 'RIVNING', description: 'Riva gammalt kakel, golv, VVS-porslin', estimatedHours: 16, hourlyRate: 650 },
        { category: 'VVS', description: 'Ny golvbrunn, rör, ventiler', estimatedHours: 24, hourlyRate: 750 },
        { category: 'BYGG', description: 'Väggar, tätskikt, membran', estimatedHours: 12, hourlyRate: 650 },
        { category: 'KAKEL', description: 'Läggning kakel väggar + klinker golv', estimatedHours: 32, hourlyRate: 650 },
        { category: 'MALNING', description: 'Tak, finish', estimatedHours: 8, hourlyRate: 550 },
        { category: 'STADNING', description: 'Slutstädning', estimatedHours: 4, hourlyRate: 500 }
      ],
      materialTemplate: [
        { materialName: 'Kakel Hornbach Premium Grå 60x60', quantity: 9.2, unit: 'kvm' },
        { materialName: 'Klinker Grå 30x30 Golv', quantity: 9.2, unit: 'kvm' },
        { materialName: 'WC-stol Gustavsberg Nordic 3510', quantity: 1, unit: 'st' },
        { materialName: 'Duschset Oras Safira 1142', quantity: 1, unit: 'st' },
        { materialName: 'Handfat Gustavsberg Nautic 5565', quantity: 1, unit: 'st' },
        { materialName: 'Handfatsblandare Tapwell TVM071', quantity: 1, unit: 'st' },
        { materialName: 'Golvbrunn Purus 7697010', quantity: 1, unit: 'st' },
        { materialName: 'VVS-paket Badrum Komplett', quantity: 1, unit: 'paket' },
        { materialName: 'Tätskikt 2-komponent 20 kg', quantity: 1, unit: 'st' },
        { materialName: 'Målningsfärg Beckers Vit 10L', quantity: 1, unit: 'st' }
      ]
    },
    {
      name: 'Standard Badrum 8 kvm + Golvvärme',
      description: 'Helrenovering badrum med elektrisk golvvärme',
      keywords: ['badrum', '8kvm', 'golvvärme', 'helrenovering'],
      mainCategory: 'VATRUM',
      subCategory: 'BADRUM',
      projectType: 'Helrenovering badrum med golvvärme',
      defaultComplexity: 'MEDIUM',
      defaultAreaSqm: 8.0,
      workTemplate: [
        { category: 'RIVNING', description: 'Riva gammalt kakel, golv, VVS-porslin', estimatedHours: 16, hourlyRate: 650 },
        { category: 'VVS', description: 'Ny golvbrunn, rör, ventiler', estimatedHours: 24, hourlyRate: 750 },
        { category: 'EL', description: 'Installation golvvärme', estimatedHours: 16, hourlyRate: 700 },
        { category: 'BYGG', description: 'Väggar, tätskikt, membran', estimatedHours: 12, hourlyRate: 650 },
        { category: 'KAKEL', description: 'Läggning kakel + klinker', estimatedHours: 32, hourlyRate: 650 },
        { category: 'MALNING', description: 'Tak, finish', estimatedHours: 8, hourlyRate: 550 },
        { category: 'STADNING', description: 'Slutstädning', estimatedHours: 4, hourlyRate: 500 }
      ],
      materialTemplate: [
        { materialName: 'Kakel Hornbach Premium Grå 60x60', quantity: 9.2, unit: 'kvm' },
        { materialName: 'Klinker Grå 30x30 Golv', quantity: 9.2, unit: 'kvm' },
        { materialName: 'Golvvärmesystem Raychem T2 Red 10 kvm', quantity: 8, unit: 'kvm' },
        { materialName: 'WC-stol Gustavsberg Nordic 3510', quantity: 1, unit: 'st' },
        { materialName: 'Duschset Oras Safira 1142', quantity: 1, unit: 'st' },
        { materialName: 'Handfat Gustavsberg Nautic 5565', quantity: 1, unit: 'st' },
        { materialName: 'VVS-paket Badrum Komplett', quantity: 1, unit: 'paket' },
        { materialName: 'El-paket Badrum', quantity: 1, unit: 'paket' }
      ]
    },
    {
      name: 'Platsbyggd Garderob 180x250',
      description: 'Platsbyggd garderob med spegelskjutdörrar',
      keywords: ['garderob', 'platsbyggd', 'spegel', 'skjutdörr'],
      mainCategory: 'SNICKERI',
      subCategory: 'GARDEROB',
      projectType: 'Platsbyggd garderob',
      defaultComplexity: 'SIMPLE',
      defaultAreaSqm: null,
      workTemplate: [
        { category: 'SNICKERI', description: 'Montering av garderob enligt kundens önskemål', estimatedHours: 8, hourlyRate: 688 }
      ],
      materialTemplate: [
        { materialName: 'Garderob PAX IKEA 180x250', quantity: 1, unit: 'st' },
        { materialName: 'Spegelskjutdörrar 180x250', quantity: 1, unit: 'st' },
        { materialName: 'Lådor för garderob 605x430x185', quantity: 4, unit: 'st' }
      ]
    },
    {
      name: 'Tapetsering 3 Rum',
      description: 'Tapetsering av 3 rum (ca 60 kvm vägg)',
      keywords: ['tapetsering', '3rum', 'hall', 'sovrum'],
      mainCategory: 'MALNING',
      subCategory: 'TAPETSERING',
      projectType: 'Tapetsering',
      defaultComplexity: 'SIMPLE',
      defaultAreaSqm: 60.0,
      workTemplate: [
        { category: 'FORBEREDELSE', description: 'Demontering lister och karmar', estimatedHours: 4, hourlyRate: 620 },
        { category: 'MALNING', description: 'Reparation av hål och skador', estimatedHours: 8, hourlyRate: 620 },
        { category: 'MALNING', description: 'Tapetsering av alla rum', estimatedHours: 32, hourlyRate: 620 },
        { category: 'FINISH', description: 'Återmontering lister och karmar', estimatedHours: 4, hourlyRate: 620 }
      ],
      materialTemplate: [
        { materialName: 'Tapet Premium (rulle)', quantity: 12, unit: 'rulle' },
        { materialName: 'Tapetlim 5L', quantity: 2, unit: 'st' }
      ]
    },
    {
      name: 'Fasadmålning Hus + Garage',
      description: 'Fasadmålning av hus, garage och gäststuga',
      keywords: ['fasad', 'målning', 'hus', 'garage', 'utvändig'],
      mainCategory: 'MALNING',
      subCategory: 'FASAD',
      projectType: 'Fasadmålning',
      defaultComplexity: 'MEDIUM',
      defaultAreaSqm: 200.0,
      workTemplate: [
        { category: 'FORBEREDELSE', description: 'Rengöring fasad med Induren, skrapning', estimatedHours: 24, hourlyRate: 620 },
        { category: 'MALNING', description: 'Målning fönsterkarmar, takfot, vindskivor', estimatedHours: 32, hourlyRate: 620 },
        { category: 'MALNING', description: 'Målning fasadytor', estimatedHours: 48, hourlyRate: 620 },
        { category: 'FINISH', description: 'Finish och slutkontroll', estimatedHours: 8, hourlyRate: 620 }
      ],
      materialTemplate: [
        { materialName: 'Fasadfärg Alcro 10L', quantity: 8, unit: 'st' },
        { materialName: 'Grundfärg 10L', quantity: 4, unit: 'st' }
      ]
    }
  ];

  console.log(`📋 Skapar ${templates.length} projektmallar...`);

  for (const template of templates) {
    await prisma.quoteTemplate.create({
      data: template
    });
  }

  console.log('✅ Projektmallar skapade!');
  console.log('');
  console.log('🎉 Seeding klar!');
  console.log('');
  console.log('📊 Sammanfattning:');
  console.log(`   - ${materials.length} material i biblioteket`);
  console.log(`   - ${templates.length} projektmallar`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Fel vid seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
