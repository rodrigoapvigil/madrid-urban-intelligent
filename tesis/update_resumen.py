import json
from pathlib import Path

path = Path(r"c:\Users\FX517\OneDrive\Desktop\TFM\FASE 4\tesis\tesis.tex")

print(f"Reading {path}...")
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new Resumen LaTeX code
resumen_latex = """% --- Resumen ---
\\chapter*{Resumen}
\\addcontentsline{toc}{chapter}{Resumen}
Tomar decisiones en el mercado de la vivienda en Madrid, ya sea para comprar, vender o alquilar, se ha convertido en una tarea de alto riesgo financiero. Con incrementos anuales de precios que marcan récords históricos desde 2007, el ciudadano se enfrenta a una asimetría de información insalvable y a una ceguera decisional preocupante. Aunque existen multitud de opiniones sobre el sector, las decisiones importantes no pueden basarse en simples comentarios o intuiciones. Como señalaba el célebre estadístico W. Edwards Deming: "Sin datos, solo eres otra persona con una opinión". La ciencia de datos y la analítica predictiva avanzada no deben ser herramientas de uso exclusivo para las grandes corporaciones inmobiliarias. El propósito fundamental de este Trabajo Fin de Máster es democratizar el acceso a la información del suelo, devolviendo la soberanía decisional y la transparencia al ciudadano común.

Para dar respuesta a estas necesidades, esta investigación presenta la evolución de \\textit{Madrid Urban Intelligent}, una plataforma web predictiva y asistida que se aleja de la concepción estática del tradicional cuadro de mando técnico. La herramienta se diversifica a través de cuatro perfiles de usuario específicos (Alquiler, Compra, Venta e Inversión), proporcionando un entorno intuitivo y personalizado para cada tipo de necesidad. La plataforma no se limita a mostrar registros históricos del pasado, sino que introduce modelos de aprendizaje automático para predecir precios futuros, dotando al sistema de una alta capacidad de anticipación y de valor estratégico real.

La solidez de la plataforma se asienta sobre un diseño de ingeniería estructurado a nivel micro-local. Se ha implementado un flujo ETL automatizado mediante la biblioteca \\textit{Playwright} en Python que descarga periódicamente los datos públicos, eliminando procesos manuales y alimentando un DataMart unificado en SQLite. Sobre esta base, se entrenaron y optimizaron modelos regresores de XGBoost (para venta) y LightGBM (para alquiler). Durante los experimentos, se demostró empíricamente que los precios inmobiliarios locales están directamente correlacionados con factores macroeconómicos y socioeconómicos del entorno, integrando con éxito variables como los tipos de interés, el volumen de hipotecas medias, la renta neta media por hogar y la tasa de transacciones locales mediante una arquitectura híbrida con fallback automático de distrito para zonas de baja frecuencia.

En la práctica, el usuario interactúa con un entorno web interactivo sin necesidad de tener conocimientos técnicos de programación o estadística. La plataforma permite analizar rentabilidades reales por barrio, estudiar trayectorias de precios históricos, realizar comparaciones y simular rentabilidades en inversiones complejas. Además, se incorpora una Asistencia Conversacional Interactiva mediante un chatbot NLP que permite consultar la base de datos de forma directa en lenguaje natural sencillo. El pipeline automático asegura que la plataforma se actualice periódicamente, garantizando que el usuario acceda siempre a los datos reales más recientes.

En conclusión, este Trabajo Fin de Máster demuestra que la ciencia de datos y la ingeniería aplicada pueden solucionar problemas reales de la ciudadanía en lugar de quedarse en un ejercicio teórico. Al conectar los datos abiertos del Ayuntamiento con la potencia del Machine Learning y la IA conversacional, \\textit{Madrid Urban Intelligent} ofrece una herramienta real que empodera al ciudadano frente a la incertidumbre del sector inmobiliario madrileño. Este trabajo abre un camino claro sobre cómo la tecnología pública e independiente debe servir a la sociedad, entregando la llave de la analítica de datos a las personas para que nadie tenga que decidir a ciegas."""

# Define the new Abstract LaTeX code
abstract_latex = """% --- Abstract ---
\\chapter*{Abstract}
\\addcontentsline{toc}{chapter}{Abstract}
Making financial decisions in Madrid's real estate market, whether buying, selling, or renting, has become a high-risk gamble. With annual price increases hitting historic records since 2007, citizens face a massive information gap and worrying decision blindness. While opinions about the sector are everywhere, major financial choices cannot rely on mere guesses or intuition. As the renowned statistician W. Edwards Deming noted: "Without data, you're just another person with an opinion." Advanced data science and predictive analytics should not be reserved only for large real estate corporations. The core purpose of this Master's Thesis is to democratize access to public property data, returning decision sovereignty and transparency to the everyday citizen.

To address these needs, this research presents the evolution of \\textit{Madrid Urban Intelligent*, a predictive and assisted web platform that moves far beyond the static design of traditional technical dashboards. The system is tailored to four distinct user profiles (Rent, Buy, Sell, and Invest), providing an intuitive and personalized experience for each path. The platform does not just display historical records; it introduces machine learning models to forecast future prices, giving the system strong predictive value and strategic foresight.

The platform's strength lies in a solid engineering architecture designed at the micro-local level. We implemented a fully automated ETL pipeline using Python's \\textit{Playwright} library, which periodically downloads public data, eliminates manual tasks, and feeds a unified SQLite DataMart. On this foundation, we trained and optimized XGBoost (for sales) and LightGBM (for rentals) regression models. Our experiments empirically proved that local real estate prices are directly tied to broader macroeconomic and social factors, integrating variables such as average interest rates, average mortgage volumes, average household income, and local transaction rates through a hybrid architecture with automatic district fallback for low-frequency areas.

In practice, the user interacts with a dynamic web environment without needing programming or statistical skills. The platform allows users to analyze real returns by neighborhood, study historical price trends, perform comparisons, and simulate profits for complex investments. Additionally, we integrated an Interactive Conversational Assistance feature through an NLP chatbot, allowing direct database queries using simple natural language. The automated pipeline ensures the platform updates periodically, guaranteeing that users always access the most current real-world data.

In conclusion, this Master's Thesis proves that applied data science and engineering can solve real citizen challenges instead of remaining a theoretical exercise. By bridging Madrid's open data with the power of machine learning and conversational AI, \\textit{Madrid Urban Intelligent} provides a real-world tool that shields citizens from real estate market uncertainty. This work outlines a clear path for how open, independent technology should serve society, putting analytical power back in the hands of the people so that no one has to navigate the city's housing market in the dark."""

# We will locate the old Resumen block and old Abstract block and replace them.
# The old Resumen block starts with "% --- Resumen ---" and ends before "% --- Abstract ---"
# The old Abstract block starts with "% --- Abstract ---" and ends before "\tableofcontents"

# Let's find index of '% --- Resumen ---'
idx_resumen = content.find('% --- Resumen ---')
idx_abstract = content.find('% --- Abstract ---')
idx_toc = content.find('\\tableofcontents')

if idx_resumen != -1 and idx_abstract != -1 and idx_toc != -1:
    new_content = content[:idx_resumen] + resumen_latex + "\n\n" + abstract_latex + "\n\n" + content[idx_toc:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Resumen and Abstract successfully replaced in LaTeX file!")
else:
    print(f"Indices: resumen={idx_resumen}, abstract={idx_abstract}, toc={idx_toc}")
    print("Could not locate the Resumen and Abstract blocks.")
