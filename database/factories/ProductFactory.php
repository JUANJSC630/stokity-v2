<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    // Registro de productos ya usados por categoría para evitar repeticiones
    private static $usedProducts = [
        'Electrónicos' => [],
        'Alimentos' => [],
        'Ropa' => [],
        'Hogar' => [],
        'default' => []
    ];
    
    // Control de productos únicos a nivel global
    private static $allUsedNames = [];
    
    // Descripciones específicas por tipo de producto
    private $productDescriptions = [
        // Electrónicos
        'Smartphone' => [
            'Smartphone con pantalla AMOLED de alta resolución, cámara de 50MP y batería de larga duración. Ideal para fotografía y uso diario.',
            'Teléfono inteligente con procesador octa-core, memoria expandible y resistencia al agua IP68. Excelente rendimiento multitarea.',
            'Celular de última generación con sistema de carga rápida, reconocimiento facial y sensor de huellas integrado en pantalla.',
        ],
        'Televisor' => [
            'Televisor con resolución 4K UHD, Smart TV con sistema operativo intuitivo y conectividad Bluetooth y WiFi.',
            'Smart TV con tecnología QLED, sonido envolvente y diseño sin bordes para una experiencia inmersiva.',
            'Televisor inteligente con control por voz, modo ambiente y procesador de imagen avanzado para colores vibrantes.',
        ],
        'Portátil' => [
            'Portátil ultraligero con procesador de última generación, disco SSD y tarjeta gráfica dedicada para tareas exigentes.',
            'Laptop con pantalla antirreflejo, teclado retroiluminado y batería de hasta 12 horas de autonomía.',
            'Computador portátil con refrigeración mejorada, ideal para trabajo remoto y estudios universitarios.',
        ],
        'Audífonos' => [
            'Audífonos con cancelación activa de ruido, hasta 30 horas de batería y calidad de audio premium.',
            'Auriculares inalámbricos con conexión multipunto, resistentes al sudor y con estuche de carga compacto.',
            'Audífonos profesionales con graves potentes, almohadillas memory foam y micrófono con cancelación de ruido.',
        ],
        // Alimentos
        'Arroz' => [
            'Arroz de grano largo, cultivado en los llanos orientales colombianos, ideal para preparar el tradicional arroz con coco.',
            'Arroz premium de cocción rápida, perfecto para acompañar bandeja paisa o cualquier plato típico colombiano.',
            'Arroz fortificado con vitaminas y minerales, de textura suelta y sabor neutro que realza cualquier preparación.',
        ],
        'Café' => [
            'Café 100% colombiano cultivado en altura, con notas a chocolate y frutos rojos. Tueste medio.',
            'Café premium de la región cafetera, procesado por métodos tradicionales y con certificación de origen.',
            'Café gourmet con aroma intenso y cuerpo balanceado, cultivado por familias cafeteras del eje cafetero.',
        ],
        'Chocolate' => [
            'Chocolate tradicional colombiano, ideal para preparar chocolate santafereño con queso y almojábanas.',
            'Cacao procesado artesanalmente, con alto contenido de sólidos de cacao y bajo en azúcar.',
            'Chocolate con tradición de más de 100 años, perfecto para desayunos y meriendas.',
        ],
        // Ropa
        'Camiseta' => [
            'Camiseta de algodón 100% colombiano, corte regular y costuras reforzadas para mayor durabilidad.',
            'Camiseta con estampado exclusivo, algodón peinado de alta calidad y cuello reforzado.',
            'Camiseta versátil de tejido transpirable, perfecta para el clima tropical colombiano.',
        ],
        'Jeans' => [
            'Jeans de denim premium con elastano, diseñado y fabricado en Colombia con los mejores estándares.',
            'Pantalón jean con lavado vintage, bolsillos funcionales y pretina cómoda para uso diario.',
            'Jeans resistente con costuras reforzadas y acabado premium, diseño atemporal para toda ocasión.',
        ],
        'Vestido' => [
            'Vestido elegante confeccionado por artesanos colombianos, ideal para ocasiones especiales.',
            'Vestido versátil con caída perfecta, estampado exclusivo y detalles hechos a mano.',
            'Vestido de diseño colombiano con telas frescas y patrones que favorecen la silueta femenina.',
        ],
        // Hogar
        'Juego de' => [
            'Juego completo fabricado con materiales duraderos y diseño elegante para complementar cualquier hogar.',
            'Set completo con acabado premium y detalles cuidadosamente trabajados por artesanos locales.',
            'Conjunto de piezas versátiles con garantía extendida y calidad certificada por estándares colombianos.',
        ],
        'Licuadora' => [
            'Licuadora potente con múltiples velocidades, cuchillas de acero inoxidable y vaso de vidrio resistente.',
            'Licuadora de alto rendimiento, ideal para preparar jugos naturales, sopas y batidos.',
            'Electrodoméstico versátil con motor silencioso y sistema de seguridad para toda la familia.',
        ],
        'Olla' => [
            'Olla fabricada con materiales de alta calidad, distribución uniforme de calor y mangos ergonómicos.',
            'Olla con recubrimiento antiadherente, ahorro energético y fácil limpieza.',
            'Utensilio de cocina resistente a altas temperaturas, ideal para la gastronomía colombiana.',
        ],
        // Default
        'default' => [
            'Producto de alta calidad fabricado en Colombia, siguiendo tradiciones artesanales.',
            'Artículo exclusivo con acabados premium y atención al detalle en cada aspecto.',
            'Producto nacional con garantía de satisfacción y soporte local.',
            'Artículo versátil diseñado para satisfacer las necesidades del mercado colombiano.',
            'Producto elaborado con los más altos estándares de calidad y materiales seleccionados.',
        ]
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Productos colombianos por categorías
        $productsByCategory = [
            // Electrónicos
            'Electrónicos' => [
                'Smartphone Samsung Galaxy A54',
                'Televisor LG 50" 4K',
                'Portátil Lenovo IdeaPad',
                'Audífonos Sony WH-1000XM4',
                'Tablet Huawei MatePad',
                'Reloj inteligente Xiaomi Mi Band',
                'Parlante JBL Charge 5',
                'Cámara Canon EOS',
                'Impresora HP LaserJet',
                'Consola Xbox Series S',
                'Laptop Apple MacBook Air',
                'Monitor Dell 27"',
                'Router TP-Link Archer',
                'Proyector Epson Home Cinema',
                'Disco duro externo Seagate 2TB',
                'Lámpara LED inteligente Philips Hue',
                'Teclado mecánico Logitech G PRO',
                'Mouse inalámbrico Razer',
                'Altavoz Google Nest Mini',
                'Aspiradora robot Xiaomi',
                'Smartwatch Apple Watch SE',
                'Cargador portátil Anker 20000mAh',
                'Cámara de acción GoPro HERO',
                'Cafetera inteligente Nespresso',
                'Batería portátil Xiaomi',
                'Kindle Paperwhite',
                'Bocinas Bose SoundLink',
                'Microondas digital Samsung',
                'Plancha de vapor Philips',
                'Reproductor Blu-ray Sony',
                'Barra de sonido Samsung',
                'Aire acondicionado portátil Midea',
                'Termostato inteligente Nest',
                'Pulsera fitness Garmin',
                'Webcam Logitech C920',
                'Disco SSD Kingston 1TB',
                'Smart TV Samsung 65"',
                'Auriculares inalámbricos Apple AirPods',
                'Cámara de seguridad Ezviz',
                'Tablet Amazon Fire',
                'Impresora multifunción Epson EcoTank'
            ],
            // Alimentos
            'Alimentos' => [
                'Arroz Diana Premium',
                'Café Juan Valdez Gourmet',
                'Chocolate Corona',
                'Galletas Saltín Noel',
                'Aceite Gourmet',
                'Arepas Don Maíz',
                'Panela La Molienda',
                'Leche Alpina',
                'Queso Colanta',
                'Yogurt Alpina',
                'Frijoles Del Valle',
                'Pasta La Muñeca',
                'Atún Van Camp\'s',
                'Azúcar Incauca',
                'Sal Refisal',
                'Mermelada Fruco',
                'Cereal Fitness Nestlé',
                'Harina Haz de Oros',
                'Lentejas Doria',
                'Miel de abejas Apícola',
                'Mayonesa Fruco',
                'Salsa de tomate Heinz',
                'Gaseosa Coca-Cola',
                'Agua Cristal',
                'Jugo Hit',
                'Helado Crem Helado',
                'Chorizo El Gallego',
                'Jamón Pietrán',
                'Margarina Rama',
                'Avena Alpina',
                'Huevos Kikes',
                'Tortillas Mission',
                'Cereal Chocapic',
                'Leche condensada Alpina',
                'Yogurt Yogo Yogo',
                'Quesito Alpina',
                'Mantequilla Alpina',
                'Tostadas Bimbo',
                'Sopa Maggi',
                'Pollo Zenú',
                'Galletas Festival'
            ],
            // Ropa
            'Ropa' => [
                'Camiseta Arturo Calle',
                'Jeans Americanino',
                'Vestido Studio F',
                'Chaqueta Cuero Vélez',
                'Zapatos Bosi Clásicos',
                'Corbata Arturo Calle',
                'Blusa Tennis',
                'Pantalón Koaj',
                'Zapatos Deportivos Adidas',
                'Falda Ela',
                'Camisa Gef',
                'Sudadera Nike',
                'Abrigo Zara',
                'Medias Punto Blanco',
                'Short Pat Primo',
                'Pijama Leonisa',
                'Camisa Polo Lacoste',
                'Bufanda Totto',
                'Chaleco Naf Naf',
                'Traje de baño Speedo',
                'Saco Tommy Hilfiger',
                'Gorra New Era',
                'Cinturón Vélez',
                'Guantes North Face',
                'Blazer Mango',
                'Falda Studio F',
                'Chaqueta Jean Koaj',
                'Leggins Adidas',
                'Tennis Skechers',
                'Pantaloneta Adidas',
                'Camisa manga corta Gef',
                'Top deportivo Nike',
                'Vestido de fiesta Ela',
                'Camiseta básica Koaj',
                'Botas Timberland',
                'Camisa formal Arturo Calle',
                'Chalina Vélez',
                'Pantalón formal Americanino',
                'Pantalón jogger Gef',
                'Polo Ralph Lauren'
            ],
            // Hogar
            'Hogar' => [
                'Juego de Sábanas HomeCenter',
                'Licuadora Oster',
                'Olla a Presión Universal',
                'Vajilla Corona',
                'Juego de Ollas Imusa',
                'Cafetera Haceb',
                'Cubiertos Tramontina',
                'Almohadas Comodísimos',
                'Cortinas HomeCenter',
                'Nevera Haceb No Frost',
                'Estufa Abba',
                'Microondas Samsung',
                'Aspiradora Electrolux',
                'Plancha Oster',
                'Toallas Familia',
                'Mesa de comedor Tugó',
                'Silla reclinable Rimax',
                'Colchón Spring',
                'Lámpara de mesa Philips',
                'Perchero de madera',
                'Espejo decorativo HomeCenter',
                'Ropero Rimax',
                'Ventilador Samurai',
                'Organizador de zapatos',
                'Dispensador de agua Haceb',
                'Tetera eléctrica Kalley',
                'Cojines decorativos Tugó',
                'Cesto para ropa Rimax',
                'Cama doble Espuma',
                'Reloj de pared Casio',
                'Sofá reclinable Tugó',
                'Cortinas blackout',
                'Dispensador de jabón automático',
                'Repisa flotante HomeCenter',
                'Cubrelecho Comodísimos',
                'Juego de baño Rimax',
                'Tendedero plegable',
                'Silla de escritorio HomeCenter',
                'Aparador de madera',
                'Candelabro decorativo'
            ],
            // Otros/Default
            'default' => [
                'Producto Colombiano',
                'Artículo Nacional',
                'Artesanía Colombiana',
                'Producto Típico',
                'Accesorio Colombiano',
                'Artículo Decorativo',
                'Souvenir Colombiano',
                'Regalo Artesanal',
                'Recuerdo Turístico',
                'Juguete Tradicional',
                'Obra de Arte Local',
                'Escultura Artesanal',
                'Producto Orgánico',
                'Textil Colombiano',
                'Cerámica Decorativa',
                'Bolso Hecho a Mano',
                'Llaveros Típicos',
                'Sombrero Vueltiao',
                'Mochila Wayuu',
                'Pulsera Artesanal',
                'Camiseta con Diseño Colombiano',
                'Vasija de Barro',
                'Café Empacado',
                'Chocolate Artesanal',
                'Cuadro Costumbrista',
                'Calendario Turístico',
                'Flauta de Caña',
                'Billetera de Cuero',
                'Réplica de Monumento',
                'Cojín Bordado',
                'Gorra Colombia',
                'Imán de Nevera',
                'Tapete Artesanal',
                'Bandeja Decorativa',
                'Vela Aromática',
                'Portavasos Artesanal',
                'Caja Tallada',
                'Jarrón Decorativo',
                'Muñeca de Trapo',
                'Cinturón Tejido'
            ],
        ];

        // Rangos de precios más realistas en pesos colombianos
        $priceRanges = [
            'Electrónicos' => ['min' => 350000, 'max' => 4500000],
            'Alimentos' => ['min' => 3000, 'max' => 35000],
            'Ropa' => ['min' => 25000, 'max' => 350000],
            'Hogar' => ['min' => 15000, 'max' => 1200000],
            'default' => ['min' => 10000, 'max' => 100000],
        ];

        // Determinar el category_id para el producto actual
        $category_id = null;
        
        // Si estamos creando este producto con un category_id específico, lo usamos
        if (isset($this->states['category_id'])) {
            $category_id = $this->states['category_id'];
        } else if (Category::count() > 0) {
            // De lo contrario, seleccionamos una categoría aleatoria
            $category_id = $this->faker->randomElement(Category::pluck('id')->toArray());
        }
        
        // Obtener la categoría y mapearla a nuestras categorías de productos
        $categoryName = 'default';
        if ($category_id) {
            try {
                $category = Category::find($category_id);
                if ($category) {
                    $categoryName = strtolower($category->name);
                    // Mapear el nombre de categoría en español al array de productos
                    if (strpos($categoryName, 'electrón') !== false) {
                        $categoryName = 'Electrónicos';
                    } elseif (strpos($categoryName, 'aliment') !== false) {
                        $categoryName = 'Alimentos';
                    } elseif (strpos($categoryName, 'ropa') !== false || strpos($categoryName, 'vest') !== false) {
                        $categoryName = 'Ropa';
                    } elseif (strpos($categoryName, 'hogar') !== false || strpos($categoryName, 'casa') !== false) {
                        $categoryName = 'Hogar';
                    } else {
                        $categoryName = 'default';
                    }
                }
            } catch (\Exception $e) {
                $categoryName = 'default';
            }
        }

        // Si no encontramos productos para esta categoría, usamos los default
        if (!isset($productsByCategory[$categoryName])) {
            $categoryName = 'default';
        }
        
        // Asegurarnos que tenemos arreglos inicializados para esta categoría
        if (!isset(self::$usedProducts[$categoryName])) {
            self::$usedProducts[$categoryName] = [];
        }
        
        // Crear una lista de productos disponibles que no han sido usados en esta categoría
        $availableProducts = array_diff($productsByCategory[$categoryName], self::$usedProducts[$categoryName]);
        
        // Si ya no hay productos disponibles, resetear para esta categoría específica
        // pero agregando un sufijo numérico para hacerlos únicos
        if (empty($availableProducts)) {
            // Para cada producto ya usado, crearemos una versión con sufijo
            foreach ($productsByCategory[$categoryName] as $baseProduct) {
                $counter = 1;
                $newProductName = $baseProduct . " #" . $counter;
                
                // Buscar un sufijo que no exista ya
                while (in_array($newProductName, self::$allUsedNames)) {
                    $counter++;
                    $newProductName = $baseProduct . " #" . $counter;
                }
                
                // Agregamos este nuevo producto a la lista de disponibles
                $availableProducts[] = $newProductName;
            }
        }
        
        // Seleccionar un producto al azar de los disponibles
        $productName = $this->faker->randomElement($availableProducts);
        
        // Registrar este producto como usado
        self::$usedProducts[$categoryName][] = $productName;
        self::$allUsedNames[] = $productName;

        // Obtenemos rango de precios para esta categoría
        $priceRange = $priceRanges[$categoryName] ?? $priceRanges['default'];

        // Generamos precios en formato colombiano
        $purchasePrice = $this->faker->numberBetween($priceRange['min'], $priceRange['max']);
        $salePrice = round($purchasePrice * $this->faker->randomFloat(2, 1.15, 1.4), -3); // Redondea a miles
        
        // Generamos una descripción coherente con el producto
        $description = $this->getProductDescription($productName);

        return [
            'name' => $productName,
            'code' => str_pad($this->faker->unique()->numberBetween(10000000, 99999999), 8, '0', STR_PAD_LEFT),
            'description' => $description,
            'purchase_price' => $purchasePrice,
            'sale_price' => $salePrice,
            'stock' => $this->faker->numberBetween(10, 100),
            'min_stock' => $this->faker->numberBetween(5, 15),
            'image' => null,
            'category_id' => $category_id ?? (Category::inRandomOrder()->first()->id ?? Category::factory()),
            'branch_id' => Branch::inRandomOrder()->first() ?? Branch::factory(),
            'status' => true,
        ];
    }
    
    /**
     * Genera una descripción coherente con el producto basada en palabras clave
     * 
     * @param string $productName Nombre del producto
     * @return string Descripción personalizada
     */
    private function getProductDescription($productName)
    {
        // Buscamos palabras clave en el nombre del producto para asignar una descripción adecuada
        foreach ($this->productDescriptions as $keyword => $descriptions) {
            if (strpos($productName, $keyword) !== false) {
                return $this->faker->randomElement($descriptions);
            }
        }
        
        // Si no encontramos coincidencias específicas, generamos una descripción genérica
        // pero añadimos el nombre del producto para hacerla más específica
        $genericDesc = $this->faker->randomElement($this->productDescriptions['default']);
        return str_replace('Producto', $productName, $genericDesc);
    }

    /**
     * Indicate that the product is low on stock.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function lowStock()
    {
        return $this->state(function (array $attributes) {
            $minStock = $attributes['min_stock'] ?? 5;
            return [
                'stock' => $this->faker->numberBetween(0, $minStock - 1),
            ];
        });
    }

    /**
     * Indicate that the product is inactive.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory
     */
    public function inactive()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => false,
            ];
        });
    }
}
