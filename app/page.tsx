"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Heart, Plus, Star, Edit2, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Pizza {
  id: string
  name: string
  image: string
  likes: number
  comments: Comment[]
  ratings: Rating[]
  averageRating: number
}

interface Comment {
  id: string
  text: string
  timestamp: number
}

interface Rating {
  id: string
  value: number
  timestamp: number
}

export default function PizzaVotingApp() {
  const [pizzas, setPizzas] = useState<Pizza[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPizzaName, setNewPizzaName] = useState("")
  const [newPizzaImage, setNewPizzaImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncUrl, setSyncUrl] = useState<string>("")

  // Cargar datos del localStorage al iniciar
  useEffect(() => {
    const savedPizzas = localStorage.getItem("pizzas")
    if (savedPizzas) {
      setPizzas(JSON.parse(savedPizzas))
    }
  }, [])

  // Guardar en localStorage cuando cambian las pizzas
  useEffect(() => {
    if (pizzas.length > 0) {
      localStorage.setItem("pizzas", JSON.stringify(pizzas))
    }
  }, [pizzas])

  // Cargar último sync al iniciar
  useEffect(() => {
    const savedSync = localStorage.getItem("lastSync")
    if (savedSync) {
      setLastSync(savedSync)
    }
  }, [])

  // Redimensionar imagen a 1080x1080
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      const img = new Image()

      img.onload = () => {
        canvas.width = 1080
        canvas.height = 1080

        // Calcular dimensiones para mantener aspecto y llenar el cuadrado
        const size = Math.min(img.width, img.height)
        const x = (img.width - size) / 2
        const y = (img.height - size) / 2

        ctx.drawImage(img, x, y, size, size, 0, 0, 1080, 1080)
        resolve(canvas.toDataURL("image/jpeg", 0.8))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewPizzaImage(file)
      const resizedImage = await resizeImage(file)
      setImagePreview(resizedImage)
    }
  }

  const addPizza = async () => {
    if (!newPizzaName.trim() || !newPizzaImage) return

    const resizedImage = await resizeImage(newPizzaImage)

    const newPizza: Pizza = {
      id: Date.now().toString(),
      name: newPizzaName.trim(),
      image: resizedImage,
      likes: 0,
      comments: [],
      ratings: [],
      averageRating: 0,
    }

    setPizzas((prev) => [...prev, newPizza])
    setNewPizzaName("")
    setNewPizzaImage(null)
    setImagePreview("")
    setShowAddForm(false)
  }

  const toggleLike = (pizzaId: string) => {
    setPizzas((prev) => prev.map((pizza) => (pizza.id === pizzaId ? { ...pizza, likes: pizza.likes + 1 } : pizza)))
  }

  const addComment = (pizzaId: string, commentText: string) => {
    if (!commentText.trim() || commentText.length > 300) return

    const newComment: Comment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      timestamp: Date.now(),
    }

    setPizzas((prev) =>
      prev.map((pizza) => (pizza.id === pizzaId ? { ...pizza, comments: [...pizza.comments, newComment] } : pizza)),
    )
  }

  const addRating = (pizzaId: string, rating: number) => {
    const newRating: Rating = {
      id: Date.now().toString(),
      value: rating,
      timestamp: Date.now(),
    }

    setPizzas((prev) =>
      prev.map((pizza) => {
        if (pizza.id === pizzaId) {
          const updatedRatings = [...pizza.ratings, newRating]
          const averageRating = updatedRatings.reduce((sum, r) => sum + r.value, 0) / updatedRatings.length
          return {
            ...pizza,
            ratings: updatedRatings,
            averageRating: Math.round(averageRating * 10) / 10,
          }
        }
        return pizza
      }),
    )
  }

  const deletePizza = (pizzaId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta pizza?")) {
      setPizzas((prev) => prev.filter((pizza) => pizza.id !== pizzaId))
    }
  }

  const editPizza = (pizzaId: string, newName: string) => {
    setPizzas((prev) => prev.map((pizza) => (pizza.id === pizzaId ? { ...pizza, name: newName } : pizza)))
  }

  const deleteComment = (pizzaId: string, commentId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este comentario?")) {
      setPizzas((prev) =>
        prev.map((pizza) =>
          pizza.id === pizzaId
            ? { ...pizza, comments: pizza.comments.filter((comment) => comment.id !== commentId) }
            : pizza,
        ),
      )
    }
  }

  const editComment = (pizzaId: string, commentId: string, newText: string) => {
    setPizzas((prev) =>
      prev.map((pizza) =>
        pizza.id === pizzaId
          ? {
              ...pizza,
              comments: pizza.comments.map((comment) =>
                comment.id === commentId ? { ...comment, text: newText, timestamp: Date.now() } : comment,
              ),
            }
          : pizza,
      ),
    )
  }

  // Función para publicar cambios
  const publishChanges = async () => {
    setIsPublishing(true)
    try {
      // Crear un objeto con todos los datos
      const dataToPublish = {
        pizzas,
        timestamp: Date.now(),
        version: "1.0",
      }

      // Convertir a JSON
      const jsonData = JSON.stringify(dataToPublish, null, 2)

      // Crear un blob y URL para descarga
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      // Crear elemento de descarga
      const a = document.createElement("a")
      a.href = url
      a.download = `pizza-voting-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Actualizar timestamp de sincronización
      setLastSync(new Date().toLocaleString())
      localStorage.setItem("lastSync", new Date().toLocaleString())

      alert("¡Datos exportados! Comparte este archivo con otros usuarios o súbelo a tu servidor.")
    } catch (error) {
      alert("Error al publicar cambios: " + error)
    } finally {
      setIsPublishing(false)
    }
  }

  // Función para importar cambios
  const importChanges = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.pizzas && Array.isArray(data.pizzas)) {
          setPizzas(data.pizzas)
          setLastSync(new Date().toLocaleString())
          localStorage.setItem("lastSync", new Date().toLocaleString())
          alert("¡Datos importados exitosamente!")
        } else {
          alert("Archivo inválido")
        }
      } catch (error) {
        alert("Error al importar: " + error)
      }
    }
    reader.readAsText(file)
  }

  // Función para sincronizar desde URL
  const syncFromUrl = async () => {
    if (!syncUrl.trim()) return

    try {
      const response = await fetch(syncUrl)
      const data = await response.json()

      if (data.pizzas && Array.isArray(data.pizzas)) {
        setPizzas(data.pizzas)
        setLastSync(new Date().toLocaleString())
        localStorage.setItem("lastSync", new Date().toLocaleString())
        alert("¡Sincronización exitosa!")
      } else {
        alert("Datos inválidos en la URL")
      }
    } catch (error) {
      alert("Error al sincronizar: " + error)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-orange-800 mb-2">🍕 Pizza Battle</h1>
          <p className="text-orange-600">Vota por tu pizza favorita</p>
        </div>

        {/* Botón agregar pizza */}
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full mb-6 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Nueva Pizza
        </Button>

        {/* Sección de Sincronización */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">🔄 Sincronización</h3>
                {lastSync && <p className="text-sm text-blue-600 mb-3">Última sincronización: {lastSync}</p>}
              </div>

              {/* Botón Publicar */}
              <Button
                onClick={publishChanges}
                disabled={isPublishing || pizzas.length === 0}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isPublishing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Publicando...
                  </>
                ) : (
                  <>📤 Publicar Cambios</>
                )}
              </Button>

              {/* Importar archivo */}
              <div>
                <Label htmlFor="import-file" className="text-sm font-medium text-blue-700">
                  Importar desde archivo:
                </Label>
                <Input id="import-file" type="file" accept=".json" onChange={importChanges} className="mt-1" />
              </div>

              {/* Sincronizar desde URL */}
              <div>
                <Label htmlFor="sync-url" className="text-sm font-medium text-blue-700">
                  Sincronizar desde URL:
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="sync-url"
                    value={syncUrl}
                    onChange={(e) => setSyncUrl(e.target.value)}
                    placeholder="https://tu-servidor.com/pizza-data.json"
                    className="flex-1"
                  />
                  <Button
                    onClick={syncFromUrl}
                    disabled={!syncUrl.trim()}
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Sync
                  </Button>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600">
                  <strong>💡 Cómo sincronizar:</strong>
                  <br />
                  1. <strong>Publicar:</strong> Descarga un archivo JSON con todos los datos
                  <br />
                  2. <strong>Importar:</strong> Carga un archivo JSON desde otro dispositivo
                  <br />
                  3. <strong>URL:</strong> Sincroniza desde un archivo JSON en línea
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario agregar pizza */}
        {showAddForm && (
          <Card className="mb-6 border-orange-200">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pizza-name">Nombre de la Pizza</Label>
                  <Input
                    id="pizza-name"
                    value={newPizzaName}
                    onChange={(e) => setNewPizzaName(e.target.value)}
                    placeholder="Ej: Pizza Margherita"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="pizza-image">Imagen (se redimensionará a 1080x1080)</Label>
                  <Input id="pizza-image" type="file" accept="image/*" onChange={handleImageChange} className="mt-1" />
                </div>

                {imagePreview && (
                  <div className="flex justify-center">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-orange-200"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={addPizza}
                    disabled={!newPizzaName.trim() || !newPizzaImage}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Agregar Pizza
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddForm(false)
                      setNewPizzaName("")
                      setNewPizzaImage(null)
                      setImagePreview("")
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de pizzas */}
        <div className="space-y-6">
          {pizzas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍕</div>
              <p className="text-gray-500">No hay pizzas aún. ¡Agrega la primera!</p>
            </div>
          ) : (
            pizzas.map((pizza) => (
              <PizzaCard
                key={pizza.id}
                pizza={pizza}
                onLike={() => toggleLike(pizza.id)}
                onComment={(comment) => addComment(pizza.id, comment)}
                onRate={(rating) => addRating(pizza.id, rating)}
                onDelete={() => deletePizza(pizza.id)}
                onEdit={(newName) => editPizza(pizza.id, newName)}
                onDeleteComment={(commentId) => deleteComment(pizza.id, commentId)}
                onEditComment={(commentId, newText) => editComment(pizza.id, commentId, newText)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function PizzaCard({
  pizza,
  onLike,
  onComment,
  onRate,
  onDelete,
  onEdit,
  onDeleteComment,
  onEditComment,
}: {
  pizza: Pizza
  onLike: () => void
  onComment: (comment: string) => void
  onRate: (rating: number) => void
  onDelete: () => void
  onEdit: (newName: string) => void
  onDeleteComment: (commentId: string) => void
  onEditComment: (commentId: string, newText: string) => void
}) {
  const [comment, setComment] = useState("")
  const [rating, setRating] = useState<number>(0)
  const [showComments, setShowComments] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(pizza.name)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editedCommentText, setEditedCommentText] = useState("")

  const handleSubmitComment = () => {
    if (comment.trim()) {
      onComment(comment)
      setComment("")
    }
  }

  const handleSubmitRating = () => {
    if (rating > 0) {
      onRate(rating)
      setRating(0)
    }
  }

  const handleEditName = () => {
    if (editedName.trim() && editedName !== pizza.name) {
      onEdit(editedName.trim())
    }
    setIsEditingName(false)
  }

  const handleCancelEditName = () => {
    setEditedName(pizza.name)
    setIsEditingName(false)
  }

  const handleEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId)
    setEditedCommentText(currentText)
  }

  const handleSaveComment = (commentId: string) => {
    if (editedCommentText.trim()) {
      onEditComment(commentId, editedCommentText.trim())
    }
    setEditingCommentId(null)
    setEditedCommentText("")
  }

  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditedCommentText("")
  }

  return (
    <Card className="border-orange-200 shadow-lg">
      <CardContent className="p-0">
        {/* Imagen */}
        <div className="relative">
          <img
            src={pizza.image || "/placeholder.svg"}
            alt={pizza.name}
            className="w-full aspect-square object-cover rounded-t-lg"
          />
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-sm font-semibold">
            {pizza.averageRating > 0 ? (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {pizza.averageRating}
              </div>
            ) : (
              <span className="text-gray-500">Sin calificar</span>
            )}
          </div>
        </div>

        <div className="p-4">
          {/* Nombre con botones de edición */}
          <div className="flex items-center justify-between mb-3">
            {isEditingName ? (
              <div className="flex-1 flex gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditName()
                    if (e.key === "Escape") handleCancelEditName()
                  }}
                />
                <Button size="sm" onClick={handleEditName} className="bg-green-500 hover:bg-green-600">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEditName}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-800 flex-1">{pizza.name}</h3>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingName(true)}
                    className="text-blue-500 hover:text-blue-600 p-1 h-auto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                    className="text-red-500 hover:text-red-600 p-1 h-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Botón Like */}
          <Button onClick={onLike} variant="outline" className="w-full mb-3 border-red-200 hover:bg-red-50">
            <Heart className="w-4 h-4 mr-2 text-red-500" />
            {pizza.likes} Likes
          </Button>

          {/* Rating */}
          <div className="mb-3">
            <Label className="text-sm font-medium mb-2 block">Calificar (1-10):</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="10"
                value={rating || ""}
                onChange={(e) => setRating(Number(e.target.value))}
                placeholder="1-10"
                className="flex-1"
              />
              <Button
                onClick={handleSubmitRating}
                disabled={rating < 1 || rating > 10}
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                Calificar
              </Button>
            </div>
          </div>

          {/* Comentario */}
          <div className="mb-3">
            <Label className="text-sm font-medium mb-2 block">Comentario:</Label>
            <div className="space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe tu opinión sobre esta pizza..."
                maxLength={300}
                className="resize-none"
                rows={3}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{comment.length}/300 caracteres</span>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!comment.trim()}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Comentar
                </Button>
              </div>
            </div>
          </div>

          {/* Ver comentarios */}
          {pizza.comments.length > 0 && (
            <div>
              <Button
                onClick={() => setShowComments(!showComments)}
                variant="ghost"
                size="sm"
                className="text-orange-600 hover:text-orange-700 p-0 h-auto"
              >
                {showComments ? "Ocultar" : "Ver"} comentarios ({pizza.comments.length})
              </Button>

              {showComments && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {pizza.comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 p-2 rounded text-sm">
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedCommentText}
                            onChange={(e) => setEditedCommentText(e.target.value)}
                            maxLength={300}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveComment(comment.id)}
                              className="bg-green-500 hover:bg-green-600 text-xs px-2 py-1 h-auto"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditComment}
                              className="text-xs px-2 py-1 h-auto"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <p className="text-gray-700 flex-1">{comment.text}</p>
                            <div className="flex gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditComment(comment.id, comment.text)}
                                className="text-blue-500 hover:text-blue-600 p-0.5 h-auto"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDeleteComment(comment.id)}
                                className="text-red-500 hover:text-red-600 p-0.5 h-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{new Date(comment.timestamp).toLocaleString()}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm text-gray-500">
            <span>{pizza.ratings.length} calificaciones</span>
            <span>{pizza.comments.length} comentarios</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
