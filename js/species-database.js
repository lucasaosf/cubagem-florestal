/**
 * species-database.js - Base de Dados Botânica Oficial e Mecanismo de Autocomplete de Espécies Florestais
 * Sistematizado conforme Sistaxon (Ibama / Sinaflor), Flora e Funga do Brasil (JBRJ) e Embrapa Florestas
 * Suporta busca inteligente por nome popular (com ou sem hífens) e nome científico
 * Desenvolvido para funcionamento 100% OFFLINE por Lucas Aøsf
 */

(function () {
  'use strict';

  // =========================================================================
  // BASE DE DADOS BOTÂNICA OFICIAL DE ESPÉCIES FLORESTAIS E MADEIREIRAS
  // =========================================================================
  const BANCO_ESPECIES = [
    // -----------------------------------------------------------------------
    // 1. SILVICULTURA E ESPÉCIES EXÓTICAS COMERCIAIS
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Eucalyptus grandis',
      sinonimos: [],
      familia: 'Myrtaceae',
      nomesPopulares: ['Eucalipto', 'Eucalipto-grandis', 'Eucalipto-rosa'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Eucalyptus saligna',
      sinonimos: [],
      familia: 'Myrtaceae',
      nomesPopulares: ['Eucalipto', 'Eucalipto-saligna', 'Eucalipto-vermelho'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Eucalyptus urophylla',
      sinonimos: [],
      familia: 'Myrtaceae',
      nomesPopulares: ['Eucalipto', 'Eucalipto-urophylla', 'Eucalipto-de-timor'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Corymbia citriodora',
      sinonimos: ['Eucalyptus citriodora'],
      familia: 'Myrtaceae',
      nomesPopulares: ['Eucalipto-citriodora', 'Eucalipto-cheiroso', 'Eucalipto-limão'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Eucalyptus dunnii',
      sinonimos: [],
      familia: 'Myrtaceae',
      nomesPopulares: ['Eucalipto', 'Eucalipto-dunnii'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Eucalyptus camaldulensis',
      sinonimos: [],
      familia: 'Myrtaceae',
      nomesPopulares: ['Eucalipto', 'Eucalipto-camaldulensis', 'Eucalipto-vermelho-do-rio'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Eucalyptus benthamii',
      sinonimos: [],
      familia: 'Myrtaceae',
      nomesPopulares: ['Eucalipto', 'Eucalipto-benthamii'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Eucalyptus urograndis',
      sinonimos: ['Eucalyptus grandis x urophylla'],
      familia: 'Myrtaceae',
      nomesPopulares: ['Eucalipto-urograndis', 'Clone-urograndis', 'Eucalipto-híbrido'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Pinus taeda',
      sinonimos: [],
      familia: 'Pinaceae',
      nomesPopulares: ['Pinus', 'Pinus-taeda', 'Pinheiro-americano', 'Pinheiro-amarelo'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Pinus elliottii',
      sinonimos: [],
      familia: 'Pinaceae',
      nomesPopulares: ['Pinus', 'Pinus-elliottii', 'Pinus-resinoso'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Pinus caribaea',
      sinonimos: ['Pinus caribaea var. hondurensis'],
      familia: 'Pinaceae',
      nomesPopulares: ['Pinus-do-caribe', 'Pinus-caribaea', 'Pinus-tropical'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Pinus oocarpa',
      sinonimos: [],
      familia: 'Pinaceae',
      nomesPopulares: ['Pinus-oocarpa', 'Pinus-mexicano'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Pinus tecunumanii',
      sinonimos: [],
      familia: 'Pinaceae',
      nomesPopulares: ['Pinus-tecunumanii'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Tectona grandis',
      sinonimos: [],
      familia: 'Lamiaceae',
      nomesPopulares: ['Teca', 'Teca-verdadeira'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Acacia mearnsii',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Acácia-negra', 'Acácia'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Acacia mangium',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Acácia-mangium', 'Acácia-australiana'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Khaya grandifoliola',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Mogno-africano', 'Khaya'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Khaya senegalensis',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Mogno-africano-do-senegal', 'Mogno-africano'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Khaya ivorensis',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Mogno-africano-ivorensis', 'Mogno-africano'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Toona ciliata',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Cedro-australiano', 'Toona'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Grevillea robusta',
      sinonimos: [],
      familia: 'Proteaceae',
      nomesPopulares: ['Grevílea', 'Grevílea-robusta', 'Carvalho-sedoso'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Cryptomeria japonica',
      sinonimos: [],
      familia: 'Cupressaceae',
      nomesPopulares: ['Criptoméria', 'Cedro-japonês'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Populus deltoides',
      sinonimos: ['Populus nigra'],
      familia: 'Salicaceae',
      nomesPopulares: ['Álamo', 'Choupo'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Casuarina equisetifolia',
      sinonimos: [],
      familia: 'Casuarinaceae',
      nomesPopulares: ['Casuarina', 'Pinheiro-da-austrália'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Melia azedarach',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Cinamomo', 'Santa-bárbara', 'Amargoseira'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Leucaena leucocephala',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Leucena', 'Leucena-arbórea'],
      origem: 'Exótica'
    },
    {
      nomeCientifico: 'Azadirachta indica',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Nim', 'Nim-indiano', 'Neem'],
      origem: 'Exótica'
    },

    // -----------------------------------------------------------------------
    // 2. IPÊS E BIGNONIÁCEAS (NATIVAS)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Handroanthus serratifolius',
      sinonimos: ['Tabebuia serratifolia'],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Ipê-amarelo', 'Pau-d\'arco', 'Ipê-amarelo-da-mata', 'Ipê-cascudo', 'Tamurá-tuíra'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Handroanthus chrysotrichus',
      sinonimos: ['Tabebuia chrysotricha'],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Ipê-amarelo-cascudo', 'Ipê-amarelo-paulista', 'Ipê-ouro'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Handroanthus albus',
      sinonimos: ['Tabebuia alba'],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Ipê-amarelo-da-serra', 'Ipê-da-serra', 'Ipê-mandioca'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Handroanthus ochraceus',
      sinonimos: ['Tabebuia ochracea'],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Ipê-amarelo-do-cerrado', 'Ipê-do-campo', 'Pau-d\'arco-do-campo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Handroanthus impetiginosus',
      sinonimos: ['Tabebuia impetiginosa', 'Tabebuia avellanedae'],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Ipê-roxo', 'Pau-d\'arco-roxo', 'Ipê-roxo-de-bola', 'Ipê-cavalo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Handroanthus heptaphyllus',
      sinonimos: ['Tabebuia heptaphylla'],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Ipê-roxo-da-mata', 'Ipê-preto', 'Pau-d\'arco-preto'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Tabebuia roseoalba',
      sinonimos: [],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Ipê-branco', 'Pau-d\'arco-branco'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Tabebuia aurea',
      sinonimos: ['Tabebuia caraiba'],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Paratudo', 'Ipê-amarelo-do-cerrado', 'Craibeira', 'Caraíba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Jacaranda copaia',
      sinonimos: [],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Marupá', 'Pará-pará', 'Caroba-do-mato', 'Copaia'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Paratecoma peroba',
      sinonimos: [],
      familia: 'Bignoniaceae',
      nomesPopulares: ['Peroba-do-campo', 'Ipê-peroba', 'Peroba-branca'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 3. MADEIRAS NOBRES — LEGUMINOSAS (FABACEAE)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Libidibia ferrea',
      sinonimos: ['Caesalpinia ferrea'],
      familia: 'Fabaceae',
      nomesPopulares: ['Pau-ferro', 'Jucá', 'Pau-ferro-do-ceará', 'Ibirá-obi'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Paubrasilia echinata',
      sinonimos: ['Caesalpinia echinata'],
      familia: 'Fabaceae',
      nomesPopulares: ['Pau-brasil', 'Ibirapitanga', 'Arabutã', 'Pau-de-pernambuco'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Dipteryx odorata',
      sinonimos: ['Coumarouna odorata'],
      familia: 'Fabaceae',
      nomesPopulares: ['Cumaru', 'Cumaru-ferro', 'Cumaru-verdadeiro', 'Fava-tonka', 'Muimapajé'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Dipteryx alata',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Baru', 'Cumbaru', 'Cumaru-do-cerrado', 'Castanha-de-bugre'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Dinizia excelsa',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Angelim-vermelho', 'Angelim-pedra-da-mata', 'Dinizia', 'Angelim-ferro'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Dinizia jueirana-facao',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jueirana-facão', 'Angelim-jueirana'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Hymenolobium petraeum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Angelim-pedra', 'Angelim-da-mata', 'Angelim-amarelo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Hymenolobium excelsum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Angelim-da-mata', 'Angelim-amarelo', 'Angelim-comum'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Dalbergia nigra',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jacarandá-da-bahia', 'Caviúna', 'Jacarandá-preto', 'Jacarandá-roxo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Dalbergia spruceana',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jacarandá-do-pará', 'Jacarandá-da-amazônia'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Dalbergia miscolobium',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jacarandá-do-cerrado', 'Caviúna-do-cerrado'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Machaerium villosum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jacarandá-paulista', 'Jacarandá-pardo', 'Jacarandá-do-mato'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Machaerium scleroxylon',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Caviúna', 'Jacarandá-caviúna', 'Pau-ferro-paulista'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Machaerium stipitatum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Sapuvinha', 'Jacarandá-do-sul', 'Sapuvas'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Machaerium acutifolium',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jacarandá-bico-de-pato', 'Bico-de-pato'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Myroxylon peruiferum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Cabriúva-vermelha', 'Bálsamo', 'Óleo-vermelho', 'Pau-de-bálsamo', 'Quina-quina'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Myrocarpus frondosus',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Cabriúva-parda', 'Cabriúva', 'Óleo-pardo', 'Caboreíba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Bowdichia virgilioides',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Sucupira-preta', 'Sucupira-do-cerrado', 'Sebipira', 'Cutriúba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Diplotropis purpurea',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Sucupira-verdadeira', 'Sucupira-da-terra-firme', 'Sapupira', 'Sucupira-parda'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Pterodon emarginatus',
      sinonimos: ['Pterodon pubescens'],
      familia: 'Fabaceae',
      nomesPopulares: ['Sucupira-branca', 'Faveiro', 'Sucupira-lisa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Vouacapoua americana',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Acapu', 'Vouacapoua', 'Pau-santo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Peltogyne paniculata',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Pau-roxo', 'Coataquiçaua', 'Roxinho', 'Guarabú'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Peltogyne confertiflora',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Pau-roxo-da-mata', 'Roxinho', 'Pau-mulato'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Hymenaea courbaril',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jatobá', 'Jatobá-da-mata', 'Jatobá-amarelo', 'Jataí', 'Algarrobo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Hymenaea parvifolia',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jatobazinho', 'Jatobá-do-cerrado'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Hymenaea stigonocarpa',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jatobá-do-cerrado', 'Jatobá-da-casca-grossa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Copaifera langsdorffii',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Copaíba', 'Óleo-de-copaíba', 'Copaibeira', 'Pau-d\'óleo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Copaifera multijuga',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Copaíba-verdadeira', 'Copaíba-da-amazônia', 'Pau-de-óleo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Apuleia leiocarpa',
      sinonimos: ['Apuleia molaris'],
      familia: 'Fabaceae',
      nomesPopulares: ['Garapa', 'Garapeira', 'Grapiapunha', 'Baratinha', 'Muira-juba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Plathymenia foliolosa',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Vinhático-da-mata', 'Vinhático-verdadeiro', 'Vinhático'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Plathymenia reticulata',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Vinhático-do-campo', 'Vinhático-do-cerrado', 'Amarelo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Schizolobium parahyba',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Guapuruvu', 'Bacurubu', 'Ficheira', 'Guapiruvu'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Schizolobium amazonicum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Paricá', 'Guapuruvu-da-amazônia', 'Pinho-cuiabano'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Anadenanthera colubrina',
      sinonimos: ['Piptadenia colubrina'],
      familia: 'Fabaceae',
      nomesPopulares: ['Angico-branco', 'Angico-cambuí', 'Cambaró', 'Angico'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Anadenanthera peregrina',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Angico-vermelho', 'Angico-do-morro', 'Niopo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Parapiptadenia rigida',
      sinonimos: ['Piptadenia rigida'],
      familia: 'Fabaceae',
      nomesPopulares: ['Angico-verdadeiro', 'Angico-gurucaia', 'Angico-cedro'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Piptadenia gonoacantha',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Pau-jacaré', 'Jacaré', 'Casca-de-jacaré'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Chloroleucon tortum',
      sinonimos: ['Pithecellobium tortum'],
      familia: 'Fabaceae',
      nomesPopulares: ['Tataré', 'Jurema-branca', 'Pau-ferro-de-espinho', 'Vinhático-de-espinho'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Enterolobium contortisiliquum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Tamboril', 'Orelha-de-negro', 'Timbaúva', 'Xiquexique', 'Timbó'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Enterolobium cyclocarpum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Guanacaste', 'Tamboril-do-norte'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Enterolobium schomburgkii',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Timborana', 'Tamboril-da-mata', 'Faveira-dura'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Centrolobium robustum',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Araribá-rosa', 'Araribá-da-mata', 'Araribá-vermelho', 'Tipuana-nativa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Centrolobium microchaete',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Araribá-amarelo', 'Araribá'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Platymiscium trinitatis',
      sinonimos: ['Platymiscium ulei'],
      familia: 'Fabaceae',
      nomesPopulares: ['Macacaúba', 'Trevo-da-amazônia', 'Macacaúba-preta'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Peltophorum dubium',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Canafístula', 'Faveiro', 'Tamboril-bravo', 'Yvyrá-pypé'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Pterogyne nitens',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Amendoim-bravo', 'Bálsamo', 'Madeira-nova', 'Cobi'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Platypodium elegans',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Amendoim-do-campo', 'Seca-sapateiro', 'Inhaé'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Melanoxylon brauna',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Braúna', 'Braúna-preta', 'Graúna', 'Maria-preta'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Stryphnodendron adstringens',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Barbatimão', 'Barbatimão-verdadeiro', 'Uabatimô'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Parkia pendula',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Fava-bolota', 'Visgueiro', 'Faveira', 'Japacanim'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Parkia multijuga',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Faveira-bengué', 'Faveira-branca', 'Fava-arara'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Zollernia ilicifolia',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Mocitaíba', 'Pau-santo', 'Espinheiro-preto'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Cenostigma pluviosum',
      sinonimos: ['Caesalpinia pluviosa'],
      familia: 'Fabaceae',
      nomesPopulares: ['Sibipiruna', 'Coração-de-negro', 'Sebipira'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Inga edulis',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Ingá-cipó', 'Ingá-doce', 'Ingazeiro'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Ormosia arborea',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Olho-de-cabra', 'Tento', 'Coronho'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Dimorphandra mollis',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Fava-d\'anta', 'Faveiro-do-campo', 'Barbatimão-falso'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Amburana cearensis',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Cumaru-do-ceará', 'Imburana', 'Umburana-de-cheiro', 'Cerejeira'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Vatairea guianensis',
      sinonimos: ['Vatairea macrocarpa'],
      familia: 'Fabaceae',
      nomesPopulares: ['Faveira-amargosa', 'Angelim-amargoso'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Vataireopsis araroba',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Angelim-araroba', 'Araroba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Mimosa caesalpiniifolia',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Sabiá', 'Sansão-do-campo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Mimosa tenuiflora',
      sinonimos: [],
      familia: 'Fabaceae',
      nomesPopulares: ['Jurema-preta', 'Jurema'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Poincianella pyramidalis',
      sinonimos: ['Cenostigma pyramidale', 'Caesalpinia pyramidalis'],
      familia: 'Fabaceae',
      nomesPopulares: ['Catingueira', 'Pau-de-porco'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 4. CEDROS E MELIÁCEAS (NATIVAS)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Cedrela fissilis',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Cedro', 'Cedro-rosa', 'Cedro-missioneiro', 'Cedro-cetim', 'Cedro-amarelo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Cedrela odorata',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Cedro-vermelho', 'Cedro-da-várzea', 'Cedro-amargo', 'Cedro-cheiroso'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Swietenia macrophylla',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Mogno', 'Mogno-brasileiro', 'Aguano', 'Araputanga', 'Acaju'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Carapa guianensis',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Andiroba', 'Andiroba-branca', 'Andiroba-vermelha', 'Carapa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Cabralea canjerana',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Canjerana', 'Cajarana', 'Pau-de-santo', 'Canharana'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Guarea guidonia',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Carrapeta', 'Marinheiro', 'Jitó', 'Pau-bala'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Guarea kunthiana',
      sinonimos: [],
      familia: 'Meliaceae',
      nomesPopulares: ['Marinheiro-da-mata', 'Pau-de-arco'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 5. LAURÁCEAS (CANELAS, IMBUIA, ITAÚBA, LOUROS)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Ocotea porosa',
      sinonimos: ['Phoebe porosa'],
      familia: 'Lauraceae',
      nomesPopulares: ['Imbuia', 'Canela-imbuia', 'Embuia', 'Imbuia-parda', 'Imbuia-amarela'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Ocotea odorifera',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Canela-sassafrás', 'Sassafrás', 'Canela-cheirosa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Ocotea puberula',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Canela-guaicá', 'Guaicá'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Ocotea catharinensis',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Canela-preta-de-santa-catarina', 'Canela-preta'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Nectandra lanceolata',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Canela-amarela', 'Canela-louro', 'Canela-branca'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Nectandra megapotamica',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Canela-preta', 'Canelinha', 'Canela-ferrugem'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Mezilaurus itauba',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Itaúba', 'Itaúba-amarela', 'Itaúba-preta', 'Itaubeira'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Mezilaurus navalium',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Tapinhoã', 'Itaúba-preta-da-mata'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Sextonia rubra',
      sinonimos: ['Ocotea rubra'],
      familia: 'Lauraceae',
      nomesPopulares: ['Louro-vermelho', 'Determa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Aniba rosaeodora',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Pau-rosa', 'Louro-rosa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Aniba canelilla',
      sinonimos: [],
      familia: 'Lauraceae',
      nomesPopulares: ['Casca-preciosa', 'Louro-precioso', 'Canelilha'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 6. CONÍFERAS NATIVAS
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Araucaria angustifolia',
      sinonimos: [],
      familia: 'Araucariaceae',
      nomesPopulares: ['Araucária', 'Pinheiro-do-paraná', 'Pinheiro-brasileiro', 'Pinheiro-das-missões'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Podocarpus lambertii',
      sinonimos: [],
      familia: 'Podocarpaceae',
      nomesPopulares: ['Pinheiro-bravo', 'Podocarpo'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 7. APOCYNACEAE (PEROBAS)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Aspidosperma polyneuron',
      sinonimos: [],
      familia: 'Apocynaceae',
      nomesPopulares: ['Peroba-rosa', 'Peroba-comum', 'Sobro', 'Pau-rosa-paulista'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Aspidosperma macrocarpon',
      sinonimos: [],
      familia: 'Apocynaceae',
      nomesPopulares: ['Peroba-do-cerrado', 'Guatambu', 'Perobinha'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Hancornia speciosa',
      sinonimos: [],
      familia: 'Apocynaceae',
      nomesPopulares: ['Mangaba', 'Mangabeira'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 8. BORAGINACEAE / CORDIACEAE (FREIJÓ E LOURO-PARDO)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Cordia goeldiana',
      sinonimos: [],
      familia: 'Cordiaceae',
      nomesPopulares: ['Freijó', 'Frei-jorge', 'Louro-freijó', 'Freijó-cinzento'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Cordia trichotoma',
      sinonimos: [],
      familia: 'Cordiaceae',
      nomesPopulares: ['Louro-pardo', 'Louro-amarelo', 'Freijó-branco', 'Louro-cabeludo'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 9. ANACARDIÁCEAS (AROEIRAS, GONÇALO-ALVES, BRAÚNAS)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Astronium lecointei',
      sinonimos: [],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Muiraquatiara', 'Gonçalo-alves-da-amazônia', 'Aroeira-da-terra-firme'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Astronium fraxinifolium',
      sinonimos: [],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Gonçalo-alves', 'Aroeira-do-campo', 'Urundeúva-do-campo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Myracrodruon urundeuva',
      sinonimos: ['Astronium urundeuva'],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Aroeira-do-sertão', 'Urundeúva', 'Aroeira-verdadeira'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Schinopsis brasiliensis',
      sinonimos: [],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Baraúna', 'Braúna-do-sertão', 'Quebracho-brasileiro'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Lithraea brasiliensis',
      sinonimos: ['Lithraea molleoides'],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Aroeira-brava', 'Bugreiro', 'Aroeirinha-do-mato'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Schinus terebinthifolia',
      sinonimos: [],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Aroeira-pimenteira', 'Aroeira-vermelha', 'Pimenta-rosa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Tapirira guianensis',
      sinonimos: [],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Tapiriri', 'Pau-pombo', 'Tatapiririca', 'Fruta-de-pombo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Spondias mombin',
      sinonimos: [],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Cajá', 'Taperebá', 'Cajazeiro', 'Acajá'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Spondias tuberosa',
      sinonimos: [],
      familia: 'Anacardiaceae',
      nomesPopulares: ['Umbuzeiro', 'Imbuzeiro', 'Umbu'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 10. LECYTHIDACEAE (JEQUITIBÁS, CASTANHEIRA, TAUARI, SAPUCAIA)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Cariniana legalis',
      sinonimos: [],
      familia: 'Lecythidaceae',
      nomesPopulares: ['Jequitibá-rosa', 'Jequitibá-vermelho', 'Estopa', 'Congona'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Cariniana estrellensis',
      sinonimos: [],
      familia: 'Lecythidaceae',
      nomesPopulares: ['Jequitibá-branco', 'Jequitibá-do-cerrado', 'Mussambê'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Bertholletia excelsa',
      sinonimos: [],
      familia: 'Lecythidaceae',
      nomesPopulares: ['Castanheira', 'Castanha-do-pará', 'Castanha-do-brasil', 'Tucari'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Couratari guianensis',
      sinonimos: [],
      familia: 'Lecythidaceae',
      nomesPopulares: ['Tauari', 'Tauari-amarelo', 'Estopeiro', 'Couratari'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Couratari oblongifolia',
      sinonimos: [],
      familia: 'Lecythidaceae',
      nomesPopulares: ['Tauari-branco', 'Tauari', 'Wadara'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Couratari stellata',
      sinonimos: [],
      familia: 'Lecythidaceae',
      nomesPopulares: ['Tauari-escuro', 'Tauari-marrom'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Lecythis pisonis',
      sinonimos: [],
      familia: 'Lecythidaceae',
      nomesPopulares: ['Sapucaia', 'Castanha-sapucaia', 'Cumbuca-de-macaco'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Eschweilera coriacea',
      sinonimos: [],
      familia: 'Lecythidaceae',
      nomesPopulares: ['Matamatá-branco', 'Matamatá'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 11. VOCHYSIACEAE (MANDIOQUEIRAS, PAU-TERRA, CAMBARÁS)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Erisma uncinatum',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Cedrorana', 'Jaboti', 'Quarubarana', 'Verdadeiro-jaboti'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Qualea paraensis',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Mandioqueira', 'Mandioqueira-áspera', 'Quaruba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Qualea rosea',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Mandioqueira-lisa', 'Mandioqueira-rósea', 'Mandioqueira'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Qualea grandiflora',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Pau-terra', 'Pau-terra-do-campo', 'Pau-terra-da-folha-miúda'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Qualea dichotoma',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Pau-terra-da-folha-larga', 'Pau-terra'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Ruizterania albiflora',
      sinonimos: ['Qualea albiflora'],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Mandioqueira-escamosa', 'Mandioqueira'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Vochysia divergens',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Cambará-do-pantanal', 'Cambará'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Vochysia haenkeana',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Vinheiro', 'Pau-de-tucano', 'Canela-santa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Vochysia maxima',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Cedro-d\'água', 'Quaruba-verdadeira', 'Quaruba-branca'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 12. SAPOTACEAE (MAÇARANDUBA, CURUPIXÁ, GOIABÃO)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Manilkara huberi',
      sinonimos: [],
      familia: 'Sapotaceae',
      nomesPopulares: ['Maçaranduba', 'Massaranduba', 'Maçaranduba-verdadeira', 'Maparajuba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Manilkara bidentata',
      sinonimos: [],
      familia: 'Sapotaceae',
      nomesPopulares: ['Maçaranduba-balata', 'Balata'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Micropholis venulosa',
      sinonimos: [],
      familia: 'Sapotaceae',
      nomesPopulares: ['Curupixá', 'Rosadinho', 'Bacupari-da-mata', 'Grubixá'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Pouteria pachycarpa',
      sinonimos: [],
      familia: 'Sapotaceae',
      nomesPopulares: ['Goiabão', 'Abiu-grande', 'Bapeba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Pouteria guianensis',
      sinonimos: [],
      familia: 'Sapotaceae',
      nomesPopulares: ['Abiurana', 'Abiu-da-mata'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Chrysophyllum gonocarpum',
      sinonimos: [],
      familia: 'Sapotaceae',
      nomesPopulares: ['Aguaí', 'Guatambu-oliva', 'Bapeba-branca'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 13. MORACEAE (TATAJUBA, GUARIÚBA, PAU-RAINHA)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Bagassa guianensis',
      sinonimos: [],
      familia: 'Moraceae',
      nomesPopulares: ['Tatajuba', 'Bagassa', 'Amarela'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Clarisia racemosa',
      sinonimos: [],
      familia: 'Moraceae',
      nomesPopulares: ['Guariúba', 'Oiticica-da-mata', 'Falso-faveiro'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Brosimum rubescens',
      sinonimos: [],
      familia: 'Moraceae',
      nomesPopulares: ['Pau-rainha', 'Muirapiranga', 'Conduru', 'Falso-pau-brasil'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Brosimum guianense',
      sinonimos: [],
      familia: 'Moraceae',
      nomesPopulares: ['Muiratinga', 'Amarelão', 'Leiteira-da-terra-firme'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Brosimum utile',
      sinonimos: [],
      familia: 'Moraceae',
      nomesPopulares: ['Amapá-doce', 'Árvore-da-vaca'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 14. COMBRETACEAE (MIRINDIBA, TANIMBUCA)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Buchenavia capitata',
      sinonimos: ['Buchenavia tetraphylla'],
      familia: 'Combretaceae',
      nomesPopulares: ['Mirindiba', 'Tanimbuca', 'Perobinha'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Terminalia amazonica',
      sinonimos: [],
      familia: 'Combretaceae',
      nomesPopulares: ['Tanimbuca-amarela', 'Cuiarana', 'Capitão-do-campo'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 15. RUTACEAE (PAU-MARFIM, GUARANTÃ)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Balfourodendron riedelianum',
      sinonimos: [],
      familia: 'Rutaceae',
      nomesPopulares: ['Pau-marfim', 'Guatambu-marfim', 'Pequiá-marfim', 'Farroupilha'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Esenbeckia leiocarpa',
      sinonimos: [],
      familia: 'Rutaceae',
      nomesPopulares: ['Guarantã', 'Pau-duro', 'Cutia'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Euxylophora paraensis',
      sinonimos: [],
      familia: 'Rutaceae',
      nomesPopulares: ['Pau-amarelo', 'Amarelinho', 'Piquiá-amarelo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Zanthoxylum rhoifolium',
      sinonimos: [],
      familia: 'Rutaceae',
      nomesPopulares: ['Mamica-de-cadela', 'Espinho-de-cheiro', 'Mamica-de-porca'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 16. MALVACEAE (SUMAÚMA, BALSA, AÇOITA-CAVALO, MUTAMBA)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Ceiba pentandra',
      sinonimos: [],
      familia: 'Malvaceae',
      nomesPopulares: ['Sumaúma', 'Samaúma', 'Paineira-da-várzea', 'Kapok'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Ochroma pyramidale',
      sinonimos: [],
      familia: 'Malvaceae',
      nomesPopulares: ['Balsa', 'Pau-de-balsa', 'Pau-de-jangada'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Luehea divaricata',
      sinonimos: [],
      familia: 'Malvaceae',
      nomesPopulares: ['Açoita-cavalo', 'Ibatingui', 'Pau-de-canga'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Guazuma ulmifolia',
      sinonimos: [],
      familia: 'Malvaceae',
      nomesPopulares: ['Mutamba', 'Guaxima-macho', 'Pau-de-pomba'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 17. CARYOCARACEAE (PEQUI, PIQUIÁ)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Caryocar villosum',
      sinonimos: [],
      familia: 'Caryocaraceae',
      nomesPopulares: ['Piquiá', 'Piquiarana', 'Pequi-da-amazônia'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Caryocar brasiliense',
      sinonimos: [],
      familia: 'Caryocaraceae',
      nomesPopulares: ['Pequi', 'Pequizeiro', 'Piqui', 'Grão-de-cavalo'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 18. CLUSIACEAE / CALOPHYLLACEAE (GUANANDI)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Calophyllum brasiliense',
      sinonimos: [],
      familia: 'Calophyllaceae',
      nomesPopulares: ['Guanandi', 'Jacareúba', 'Landim', 'Olandi'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Kielmeyera coriacea',
      sinonimos: [],
      familia: 'Calophyllaceae',
      nomesPopulares: ['Pau-santo-do-cerrado', 'Pau-santo', 'Rosa-do-campo'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 19. SIMAROUBACEAE (MARUPÁ)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Simarouba amara',
      sinonimos: [],
      familia: 'Simaroubaceae',
      nomesPopulares: ['Marupá-branco', 'Simaruba', 'Caixeta-branca', 'Pau-paraíba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Simarouba versicolor',
      sinonimos: [],
      familia: 'Simaroubaceae',
      nomesPopulares: ['Paraíba', 'Caixeta-do-cerrado'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 20. MYRISTICACEAE (VIROLA, UCUÚBA)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Virola surinamensis',
      sinonimos: [],
      familia: 'Myristicaceae',
      nomesPopulares: ['Ucuúba', 'Virola', 'Bicuba', 'Ucuúba-da-várzea'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Virola sebifera',
      sinonimos: [],
      familia: 'Myristicaceae',
      nomesPopulares: ['Ucuúba-vermelha', 'Bicuba-da-mata'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 21. GOUPIACEAE (CUPIÚBA)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Goupia glabra',
      sinonimos: [],
      familia: 'Goupiaceae',
      nomesPopulares: ['Cupiúba', 'Peniqueiro', 'Cupiúba-verdadeira', 'Kabukalli'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 22. BURSERACEAE (BREUS)
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Protium heptaphyllum',
      sinonimos: [],
      familia: 'Burseraceae',
      nomesPopulares: ['Breu-branco', 'Almécega', 'Breueiro'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Tetragastris altissima',
      sinonimos: [],
      familia: 'Burseraceae',
      nomesPopulares: ['Breu-manga', 'Almecegueira', 'Samaúba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Trattinnickia burserifolia',
      sinonimos: [],
      familia: 'Burseraceae',
      nomesPopulares: ['Amesclão', 'Breu-sucuruba'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 23. EUPHORBIACEAE & PHYLLANTHACEAE
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Hevea brasiliensis',
      sinonimos: [],
      familia: 'Euphorbiaceae',
      nomesPopulares: ['Seringueira', 'Pau-borracha', 'Árvore-da-borracha'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Alchornea triplinervia',
      sinonimos: [],
      familia: 'Euphorbiaceae',
      nomesPopulares: ['Tanheiro', 'Tapiá', 'Aperta-ruão'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Croton floribundus',
      sinonimos: [],
      familia: 'Euphorbiaceae',
      nomesPopulares: ['Capixingui', 'Velame'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Sebastiania commersoniana',
      sinonimos: ['Gymnanthes klotzschiana'],
      familia: 'Euphorbiaceae',
      nomesPopulares: ['Branquilho', 'Branquilho-do-rio'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Hieronyma alchorneoides',
      sinonimos: [],
      familia: 'Phyllanthaceae',
      nomesPopulares: ['Licurana', 'Urucurana', 'Pau-de-vinho'],
      origem: 'Nativa'
    },

    // -----------------------------------------------------------------------
    // 24. OUTRAS ESPÉCIES ARBÓREAS E FLORESTAIS BRASILEIRAS
    // -----------------------------------------------------------------------
    {
      nomeCientifico: 'Gallesia integrifolia',
      sinonimos: [],
      familia: 'Petiveriaceae',
      nomesPopulares: ['Pau-d\'alho', 'Guararema', 'Ibirarema'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Casearia sylvestris',
      sinonimos: [],
      familia: 'Salicaceae',
      nomesPopulares: ['Guaçatonga', 'Café-bravo', 'Chá-de-bugre', 'Erva-de-pontada'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Laetia procera',
      sinonimos: [],
      familia: 'Salicaceae',
      nomesPopulares: ['Pau-jacaré', 'Pau-pombo-branco'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Campomanesia xanthocarpa',
      sinonimos: [],
      familia: 'Myrtaceae',
      nomesPopulares: ['Guabiroba', 'Gabirobeira', 'Guabiroba-da-mata'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Eugenia uniflora',
      sinonimos: [],
      familia: 'Myrtaceae',
      nomesPopulares: ['Pitangueira', 'Pitanga'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Tibouchina granulosa',
      sinonimos: ['Pleroma granulosum'],
      familia: 'Melastomataceae',
      nomesPopulares: ['Quaresmeira', 'Flor-de-quaresma'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Cecropia pachystachya',
      sinonimos: ['Cecropia peltata'],
      familia: 'Urticaceae',
      nomesPopulares: ['Embaúba', 'Imbaúba', 'Embaubeira', 'Torém'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Trema micrantha',
      sinonimos: [],
      familia: 'Cannabaceae',
      nomesPopulares: ['Candiúba', 'Pau-pólvora', 'Grandiúva'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Citharexylum myrianthum',
      sinonimos: [],
      familia: 'Verbenaceae',
      nomesPopulares: ['Tucaneiro', 'Pau-viola'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Matayba elaeagnoides',
      sinonimos: [],
      familia: 'Sapindaceae',
      nomesPopulares: ['Camboatá-branco', 'Mataíba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Cupania vernalis',
      sinonimos: [],
      familia: 'Sapindaceae',
      nomesPopulares: ['Camboatá-vermelho', 'Arco-de-pipa', 'Camboatá'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Allophylus edulis',
      sinonimos: [],
      familia: 'Sapindaceae',
      nomesPopulares: ['Chal-chal', 'Fruta-de-pombo'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Vernonanthura discolor',
      sinonimos: [],
      familia: 'Asteraceae',
      nomesPopulares: ['Vassourão-branco', 'Vassorão'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Piptocarpha angustifolia',
      sinonimos: [],
      familia: 'Asteraceae',
      nomesPopulares: ['Vassourão-preto', 'Piptocarfa'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Curatella americana',
      sinonimos: [],
      familia: 'Dilleniaceae',
      nomesPopulares: ['Lixeira', 'Sambaíba'],
      origem: 'Nativa'
    },
    {
      nomeCientifico: 'Salvertia convallariodora',
      sinonimos: [],
      familia: 'Vochysiaceae',
      nomesPopulares: ['Folha-de-bicho', 'Pau-de-colher'],
      origem: 'Nativa'
    }
  ];

  // =========================================================================
  // NORMALIZADOR DE TEXTO (IGNORA ACENTOS, HÍFENS, MAIÚSCULAS E PONTUAÇÃO)
  // =========================================================================
  function normalizarTexto(txt) {
    if (!txt) return '';
    return txt
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[-_'/.,;:()]/g, ' ')   // hífens e pontuação viram espaço para permitir busca sem '-'
      .replace(/\s+/g, ' ')           // colapsa múltiplos espaços
      .trim()
      .toLowerCase();
  }

  // =========================================================================
  // INTEGRAÇÃO AUTOMÁTICA COM A BASE MODO CAMPEIRO (315 PRANCHAS ILUSTRADAS)
  // =========================================================================
  if (typeof window !== 'undefined' && Array.isArray(window.ESPECIES_CAMPEIRO)) {
    const mapaExistentes = new Map();
    BANCO_ESPECIES.forEach((sp, idx) => {
      mapaExistentes.set(normalizarTexto(sp.nomeCientifico), idx);
    });

    window.ESPECIES_CAMPEIRO.forEach((spCam) => {
      const chave = normalizarTexto(spCam.nomeCientifico);
      if (mapaExistentes.has(chave)) {
        const idx = mapaExistentes.get(chave);
        const original = BANCO_ESPECIES[idx];
        original.prancha = spCam.prancha;
        original.imagem = spCam.imagem;
        original.thumb = spCam.thumb;
        original.caracteristicas = spCam.caracteristicas;
        original.ameaca = spCam.ameaca || original.ameaca || 'NA';
        original.biomas = spCam.biomas || original.biomas;
        original.fonte = spCam.fonte;
        (spCam.nomesPopulares || []).forEach((np) => {
          if (!original.nomesPopulares.some((p) => normalizarTexto(p) === normalizarTexto(np))) {
            original.nomesPopulares.push(np);
          }
        });
      } else {
        BANCO_ESPECIES.push(spCam);
        mapaExistentes.set(chave, BANCO_ESPECIES.length - 1);
      }
    });
  }

  // Pré-indexar termos de busca para cada espécie acelerando o processamento offline
  const BANCO_INDEXADO = BANCO_ESPECIES.map((sp) => {
    const scNorm = normalizarTexto(sp.nomeCientifico);
    const famNorm = normalizarTexto(sp.familia);
    const popNorm = sp.nomesPopulares.map(normalizarTexto);
    const sinNorm = (sp.sinonimos || []).map(normalizarTexto);
    const biomasNorm = (sp.biomas || []).map(normalizarTexto);
    const ameacaNorm = normalizarTexto(sp.ameaca || '');
    const traitsNorm = sp.caracteristicas
      ? [
          normalizarTexto(sp.caracteristicas.filotaxia || ''),
          normalizarTexto(sp.caracteristicas.folha || ''),
          normalizarTexto(sp.caracteristicas.exsudacao || '')
        ]
      : [];

    return {
      raw: sp,
      scNorm,
      famNorm,
      popNorm,
      sinNorm,
      biomasNorm,
      ameacaNorm,
      allTermsNorm: [
        scNorm,
        famNorm,
        ...popNorm,
        ...sinNorm,
        ...biomasNorm,
        ameacaNorm,
        ...traitsNorm
      ].join(' ')
    };
  });

  // =========================================================================
  // MOTOR DE BUSCA DE ESPÉCIES (RELEVÂNCIA E TOLERÂNCIA A HÍFENS)
  // =========================================================================
  function buscarEspecies(termoBusca, limite = 8) {
    const q = normalizarTexto(termoBusca);
    if (!q || q.length < 2) return [];

    const palavrasQuery = q.split(' ').filter(Boolean);
    const resultados = [];

    for (let i = 0; i < BANCO_INDEXADO.length; i++) {
      const item = BANCO_INDEXADO[i];
      let pontuacao = 0;

      // 1. Coincidência exata do nome científico ou popular
      if (item.scNorm === q) {
        pontuacao += 100;
      } else if (item.popNorm.some((p) => p === q)) {
        pontuacao += 90;
      }
      // 2. Início do nome científico ou popular
      else if (item.scNorm.startsWith(q)) {
        pontuacao += 70;
      } else if (item.popNorm.some((p) => p.startsWith(q))) {
        pontuacao += 60;
      }
      // 3. Contém todas as palavras da busca (ex: "pau ferro", "ipe amarelo", "pinus taeda")
      else {
        const atendeTodas = palavrasQuery.every((palavra) => item.allTermsNorm.includes(palavra));
        if (atendeTodas) {
          pontuacao += 40;
          if (item.popNorm.some((p) => p.includes(q))) pontuacao += 20;
          if (item.scNorm.includes(q)) pontuacao += 15;
        }
      }

      if (pontuacao > 0) {
        resultados.push({
          especie: item.raw,
          pontuacao
        });
      }
    }

    // Ordenar por pontuação decrescente
    resultados.sort((a, b) => b.pontuacao - a.pontuacao);

    return resultados.slice(0, limite).map((r) => r.especie);
  }

  // =========================================================================
  // BUSCA AVANÇADA PARA O GUIA BOTÂNICO DE CAMPO
  // =========================================================================
  function searchEspeciesAvancada(termoBusca = '', filtroOuLimite = 'todas', maybeLimit = 50) {
    let categoria = 'todas';
    let limite = 50;

    if (typeof filtroOuLimite === 'number') {
      limite = filtroOuLimite;
    } else if (typeof filtroOuLimite === 'string') {
      categoria = filtroOuLimite;
      limite = typeof maybeLimit === 'number' ? maybeLimit : 50;
    } else if (typeof filtroOuLimite === 'object' && filtroOuLimite !== null) {
      categoria = filtroOuLimite.category || 'todas';
      limite = filtroOuLimite.limit || 50;
    }

    const q = normalizarTexto(termoBusca || '');
    const palavrasQuery = q ? q.split(' ').filter(Boolean) : [];

    let pool = BANCO_INDEXADO;

    // Filtro por categoria
    if (categoria && categoria !== 'todas') {
      pool = pool.filter((item) => {
        const sp = item.raw;
        if (categoria === 'campeiro') return !!sp.prancha;
        if (categoria === 'cerrado') {
          return sp.biomas && sp.biomas.some((b) => normalizarTexto(b).includes('cerrado'));
        }
        if (categoria === 'ameacadas') return sp.ameaca && sp.ameaca !== 'NA';
        if (categoria === 'nativas') return sp.origem === 'Nativa';
        if (categoria === 'comerciais') {
          return (
            sp.origem === 'Exótica' ||
            (sp.nomesPopulares &&
              sp.nomesPopulares.some((n) => /eucalipto|pinus|teca|cedro|mogno|acacia/i.test(n)))
          );
        }
        return true;
      });
    }

    if (!q) {
      // Se não houver termo de busca, priorizar quem tem prancha e ordenar alfabeticamente
      const ordenado = [...pool].sort((a, b) => {
        const temA = a.raw.prancha ? 1 : 0;
        const temB = b.raw.prancha ? 1 : 0;
        if (temB !== temA) return temB - temA;
        return (a.raw.nomesPopulares[0] || '').localeCompare(b.raw.nomesPopulares[0] || '');
      });
      return ordenado.slice(0, limite).map((item) => item.raw);
    }

    const resultados = [];
    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      let pontuacao = 0;

      if (item.scNorm === q) pontuacao += 100;
      else if (item.popNorm.some((p) => p === q)) pontuacao += 95;
      else if (item.scNorm.startsWith(q)) pontuacao += 75;
      else if (item.popNorm.some((p) => p.startsWith(q))) pontuacao += 70;
      else if (item.famNorm === q) pontuacao += 50;
      else {
        const atendeTodas = palavrasQuery.every((palavra) => item.allTermsNorm.includes(palavra));
        if (atendeTodas) {
          pontuacao += 40;
          if (item.popNorm.some((p) => p.includes(q))) pontuacao += 20;
          if (item.scNorm.includes(q)) pontuacao += 15;
          if (item.famNorm.includes(q)) pontuacao += 10;
        }
      }

      if (pontuacao > 0) {
        if (item.raw.prancha) pontuacao += 15; // Bônus para espécie ilustrada com prancha
        resultados.push({
          especie: item.raw,
          pontuacao
        });
      }
    }

    resultados.sort((a, b) => b.pontuacao - a.pontuacao);
    return resultados.slice(0, limite).map((r) => r.especie);
  }

  // =========================================================================
  // CONTROLADOR DE AUTOCOMPLETE DE INTERFACE (COMPONENT)
  // =========================================================================
  class SpeciesAutocomplete {
    constructor(inputElement, options = {}) {
      this.input = inputElement;
      this.options = Object.assign(
        {
          onSelect: null,
          minChars: 2,
          maxResults: 8
        },
        options
      );

      this.dropdown = null;
      this.currentFocus = -1;
      this.items = [];
      this.debounceTimer = null;

      this.init();
    }

    init() {
      if (!this.input) return;

      // Desativar autocomplete nativo do navegador
      this.input.setAttribute('autocomplete', 'off');
      this.input.setAttribute('spellcheck', 'false');

      // Garantir posicionamento relativo no pai
      const parent = this.input.parentElement;
      if (parent && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }

      // Criar elemento dropdown
      this.dropdown = document.createElement('div');
      this.dropdown.className = 'species-autocomplete-dropdown';
      this.dropdown.style.display = 'none';
      if (parent) parent.appendChild(this.dropdown);

      // Eventos do input
      this.input.addEventListener('input', () => this.onInput());
      this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
      this.input.addEventListener('focus', () => {
        if (this.input.value.trim().length >= this.options.minChars) {
          this.triggerSearch(this.input.value);
        }
      });

      // Fechar ao clicar fora
      document.addEventListener('click', (e) => {
        if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
          this.fechar();
        }
      });
    }

    onInput() {
      clearTimeout(this.debounceTimer);
      const val = this.input.value;
      if (val.trim().length < this.options.minChars) {
        this.fechar();
        return;
      }

      this.debounceTimer = setTimeout(() => {
        this.triggerSearch(val);
      }, 50);
    }

    triggerSearch(query) {
      const results = buscarEspecies(query, this.options.maxResults);
      this.renderResults(results, query);
    }

    renderResults(results, query) {
      this.items = results;
      this.currentFocus = -1;

      if (!results || results.length === 0) {
        this.dropdown.innerHTML = `
          <div class="species-item-empty">
            Nenhuma espécie encontrada no catálogo para "<strong>${escapeHtml(query)}</strong>".
            <div style="font-size: 0.72rem; color: var(--muted); margin-top: 2px;">Você pode continuar digitando o nome livremente.</div>
          </div>
        `;
        this.dropdown.style.display = 'block';
        return;
      }

      this.dropdown.innerHTML = results
        .map((sp, idx) => {
          const nomePrincipal = sp.nomesPopulares[0] || '';
          const outrosNomes = sp.nomesPopulares.slice(1).join(', ');
          const isExotica = sp.origem === 'Exótica';
          const badgeClass = isExotica ? 'badge-exotica' : 'badge-nativa';
          const badgeText = isExotica ? '🌲 Exótica' : '🌿 Nativa';

          return `
            <div class="species-autocomplete-item" data-index="${idx}">
              <div class="species-item-left">
                <div class="species-pop-name">
                  <strong>${escapeHtml(nomePrincipal)}</strong>
                  ${outrosNomes ? `<span class="species-sub-pop">• ${escapeHtml(outrosNomes)}</span>` : ''}
                </div>
                <div class="species-sc-name">
                  <em>${escapeHtml(sp.nomeCientifico)}</em>
                  <span class="species-family">(${escapeHtml(sp.familia)})</span>
                </div>
              </div>
              <div class="species-item-right">
                <span class="species-origin-pill ${badgeClass}">${badgeText}</span>
              </div>
            </div>
          `;
        })
        .join('');

      this.dropdown.style.display = 'block';

      // Eventos de clique nas opções
      this.dropdown.querySelectorAll('.species-autocomplete-item').forEach((el) => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault(); // Impede perda prematura de foco
          const idx = parseInt(el.getAttribute('data-index'), 10);
          this.selecionarItem(idx);
        });
      });
    }

    selecionarItem(index) {
      if (index < 0 || index >= this.items.length) return;
      const sp = this.items[index];

      // Formato padrão florestal de exibição: Nome Popular (Nome Científico)
      const nomePopularPrincipal = sp.nomesPopulares[0] || '';
      const textoFinal = `${nomePopularPrincipal} (${sp.nomeCientifico})`;

      this.input.value = textoFinal;
      this.fechar();

      // Dispara evento nativo 'input' e 'change' para acionar ouvintes do app
      this.input.dispatchEvent(new Event('input', { bubbles: true }));
      this.input.dispatchEvent(new Event('change', { bubbles: true }));

      // Callback opcional (ex: sincronizar seletor de Nativa / Exótica)
      if (typeof this.options.onSelect === 'function') {
        this.options.onSelect(sp, textoFinal);
      }
    }

    onKeyDown(e) {
      if (this.dropdown.style.display === 'none') return;

      const itemsEls = this.dropdown.querySelectorAll('.species-autocomplete-item');
      if (itemsEls.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.currentFocus++;
        if (this.currentFocus >= itemsEls.length) this.currentFocus = 0;
        this.atualizarItemAtivo(itemsEls);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.currentFocus--;
        if (this.currentFocus < 0) this.currentFocus = itemsEls.length - 1;
        this.atualizarItemAtivo(itemsEls);
      } else if (e.key === 'Enter') {
        if (this.currentFocus > -1) {
          e.preventDefault();
          this.selecionarItem(this.currentFocus);
        }
      } else if (e.key === 'Escape') {
        this.fechar();
      }
    }

    atualizarItemAtivo(itemsEls) {
      itemsEls.forEach((el, idx) => {
        el.classList.toggle('active', idx === this.currentFocus);
        if (idx === this.currentFocus) {
          el.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    fechar() {
      if (this.dropdown) {
        this.dropdown.style.display = 'none';
        this.dropdown.innerHTML = '';
      }
      this.currentFocus = -1;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================================================================
  // EXPORTAÇÃO GLOBAL NO OBJETO WINDOW (CUBAGEM & GUIA BOTÂNICO)
  // =========================================================================
  const especiesApi = {
    BANCO: BANCO_ESPECIES,
    buscar: buscarEspecies,
    search: searchEspeciesAvancada,
    getAll: () => BANCO_ESPECIES,
    getPrancha: (num) => BANCO_ESPECIES.find((sp) => sp.prancha === parseInt(num, 10)),
    normalizar: normalizarTexto,
    Autocomplete: SpeciesAutocomplete,

    // Inicializa autocomplete no input individual de espécies de toras
    initInputs(appInstance) {
      const inpTora = document.getElementById('cubEspecieTora');

      if (inpTora) {
        new SpeciesAutocomplete(inpTora, {
          onSelect: (sp, formattedText) => {
            if (appInstance && typeof appInstance.setOrigemMadeira === 'function') {
              appInstance.setOrigemMadeira(sp.origem);
            }
          }
        });
      }
    }
  };

  window.CubagemEspecies = especiesApi;
  window.speciesDatabase = especiesApi;

  console.log(`[Espécies Florestais] Banco botânico carregado com ${BANCO_ESPECIES.length} espécies brasileiras (Sistaxon / Sinaflor / Flora do Brasil / Modo Campeiro).`);
})();
